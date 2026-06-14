"""
Feature Engineering Pipeline for URL and Event Analysis
Extracts and scores URLs, suspicious patterns, and indicators
"""
from __future__ import annotations

import re
import hashlib
import math
from urllib.parse import urlparse, parse_qs
from typing import Any


class URLFeatureExtractor:
    """Extracts features and calculates risk score for URLs"""
    
    SUSPICIOUS_TLDS = {"tk", "ml", "ga", "cf", "xyz", "top", "download", "zip", "review"}
    SHORTENER_DOMAINS = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "rebrand.ly", "short.link"}
    BRAND_KEYWORDS = {"apple", "google", "microsoft", "amazon", "paypal", "bank", "cih", "attijariwafa"}
    
    def __init__(self):
        self.features = {}
        
    def extract_features(self, url: str) -> dict[str, Any]:
        """Extract all features from URL"""
        self.features = {
            "url": url,
            "length": len(url),
            "domain": "",
            "domain_entropy": 0.0,
            "subdomain_count": 0,
            "suspicious_tld": False,
            "has_ip_address": False,
            "has_homoglyph": False,
            "typosquatting_risk": False,
            "is_shortener": False,
            "has_https": False,
            "path_depth": 0,
            "query_param_count": 0,
            "suspicious_patterns": [],
        }
        
        try:
            parsed = urlparse(url)
            self.features["domain"] = parsed.netloc
            self.features["has_https"] = parsed.scheme == "https"
            
            # Check for IP address
            if self._is_ip_address(parsed.netloc):
                self.features["has_ip_address"] = True
                self.features["suspicious_patterns"].append("ip_address")
            
            # Extract domain parts
            domain_parts = parsed.netloc.split(".")
            self.features["subdomain_count"] = max(0, len(domain_parts) - 2)
            
            # Check TLD
            if len(domain_parts) > 0:
                tld = domain_parts[-1].lower()
                if tld in self.SUSPICIOUS_TLDS:
                    self.features["suspicious_tld"] = True
                    self.features["suspicious_patterns"].append("suspicious_tld")
            
            # Check for shortener
            if any(shortener in parsed.netloc.lower() for shortener in self.SHORTENER_DOMAINS):
                self.features["is_shortener"] = True
                self.features["suspicious_patterns"].append("shortener")
            
            # Check for typosquatting
            domain_name = domain_parts[-2] if len(domain_parts) >= 2 else ""
            for brand in self.BRAND_KEYWORDS:
                if self._levenshtein_distance(domain_name.lower(), brand) <= 2:
                    self.features["typosquatting_risk"] = True
                    self.features["suspicious_patterns"].append("typosquatting")
            
            # Check for homoglyphs
            if self._has_homoglyphs(parsed.netloc):
                self.features["has_homoglyph"] = True
                self.features["suspicious_patterns"].append("homoglyph")
            
            # Path analysis
            if parsed.path:
                self.features["path_depth"] = parsed.path.count("/") - 1
            
            # Query parameters
            if parsed.query:
                self.features["query_param_count"] = len(parse_qs(parsed.query))
            
            # Domain entropy
            self.features["domain_entropy"] = self._calculate_entropy(parsed.netloc)
            
        except Exception as e:
            self.features["suspicious_patterns"].append("parse_error")
        
        return self.features
    
    def calculate_risk_score(self) -> dict[str, Any]:
        """Calculate URL risk score (0-1) based on features"""
        score = 0.0
        reasons = []
        
        # Length anomaly
        if self.features["length"] > 75:
            score += 0.05
            reasons.append("url_length")
        
        # IP address
        if self.features["has_ip_address"]:
            score += 0.20
            reasons.append("ip_address")
        
        # Suspicious TLD
        if self.features["suspicious_tld"]:
            score += 0.15
            reasons.append("suspicious_tld")
        
        # Homoglyph
        if self.features["has_homoglyph"]:
            score += 0.20
            reasons.append("homoglyph_characters")
        
        # Typosquatting
        if self.features["typosquatting_risk"]:
            score += 0.25
            reasons.append("brand_typosquatting")
        
        # Shortener
        if self.features["is_shortener"]:
            score += 0.20
            reasons.append("shortened_url")
        
        # No HTTPS
        if not self.features["has_https"] and "://" in self.features["url"]:
            score += 0.10
            reasons.append("no_https")
        
        # High subdomain count
        if self.features["subdomain_count"] > 3:
            score += 0.10
            reasons.append("excessive_subdomains")
        
        # High entropy domain
        if self.features["domain_entropy"] > 4.0:
            score += 0.10
            reasons.append("high_entropy_domain")
        
        # High query parameter count
        if self.features["query_param_count"] > 5:
            score += 0.10
            reasons.append("excessive_parameters")
        
        # Suspicious characters
        if any(pattern in self.features["suspicious_patterns"] for pattern in ["homoglyph", "parse_error"]):
            score += 0.05
            reasons.append("suspicious_characters")
        
        return {
            "url_risk": min(0.99, round(score, 2)),
            "url_reasons": reasons,
            "feature_details": self.features,
        }
    
    @staticmethod
    def _is_ip_address(domain: str) -> bool:
        """Check if domain is IP address"""
        parts = domain.split(".")
        if len(parts) != 4:
            return False
        try:
            return all(0 <= int(part) <= 255 for part in parts)
        except ValueError:
            return False
    
    @staticmethod
    def _has_homoglyphs(domain: str) -> bool:
        """Check for homoglyph characters (lookalikes)"""
        homoglyph_patterns = [
            (r"0", "o"),  # zero vs letter o
            (r"1", "l"),  # one vs letter l
            (r"5", "s"),  # five vs letter s
        ]
        for pattern, _ in homoglyph_patterns:
            if pattern in domain:
                return True
        return False
    
    @staticmethod
    def _levenshtein_distance(s1: str, s2: str) -> int:
        """Calculate Levenshtein distance between strings"""
        if len(s1) < len(s2):
            return URLFeatureExtractor._levenshtein_distance(s2, s1)
        if len(s2) == 0:
            return len(s1)
        
        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]
    
    @staticmethod
    def _calculate_entropy(text: str) -> float:
        """Calculate Shannon entropy of text"""
        if not text:
            return 0.0
        
        frequencies = {}
        for char in text:
            frequencies[char] = frequencies.get(char, 0) + 1
        
        entropy = 0.0
        text_len = len(text)
        for count in frequencies.values():
            probability = count / text_len
            entropy -= probability * math.log2(probability)
        
        return round(entropy, 2)


class EventFeatureExtractor:
    """Extracts features from security events"""
    
    def extract_message_features(self, content: str) -> dict[str, int]:
        """Extract message-level features"""
        normalized = content.lower()
        
        features = {
            "has_url": 1 if self._has_url(content) else 0,
            "has_phone": 1 if self._has_phone_number(content) else 0,
            "has_email": 1 if self._has_email(content) else 0,
            "urgency_score": self._urgency_score(normalized),
            "has_currency": 1 if self._has_currency(content) else 0,
        }
        
        return features
    
    @staticmethod
    def _has_url(text: str) -> bool:
        """Check if text contains URL"""
        return bool(re.search(r'https?://|www\.', text, re.IGNORECASE))
    
    @staticmethod
    def _has_phone_number(text: str) -> bool:
        """Check if text contains phone number"""
        return bool(re.search(r'\+?[0-9]\d{1,14}', text))
    
    @staticmethod
    def _has_email(text: str) -> bool:
        """Check if text contains email"""
        return bool(re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text))
    
    @staticmethod
    def _urgency_score(normalized_text: str) -> int:
        """Score urgency indicators (0-3)"""
        urgency_keywords = [
            "urgent", "immediately", "now", "asap",
            "immediatement", "vite", "maintenant",
            "عاجل", "دابا", "فوراً"
        ]
        count = sum(1 for keyword in urgency_keywords if keyword in normalized_text)
        return min(3, count)
    
    @staticmethod
    def _has_currency(text: str) -> bool:
        """Check if text mentions currency or money"""
        currency_patterns = [r'\$\d+', r'€\d+', r'\d+\s*(MAD|USD|EUR|GBP)', r'(dollar|euro|pound|dirham)']
        return any(re.search(pattern, text, re.IGNORECASE) for pattern in currency_patterns)
