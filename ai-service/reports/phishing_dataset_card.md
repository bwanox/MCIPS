# Phishing Detection Dataset Card

## Dataset Overview

**Dataset Name:** Multilingual Phishing Detection Dataset  
**Version:** 1.0.0  
**Created:** 2025-01-15  
**Language:** English, French, Arabic, Moroccan Darija  
**Task:** Phishing Message Classification  

## Dataset Composition

### Total Samples: 8 (Pilot Dataset)

The dataset contains multilingual phishing and safe SMS/messaging examples with focus on Moroccan financial institutions and threats.

| Language | Phishing | Safe | Scam | Total |
|----------|----------|------|------|-------|
| English  | 1        | 1    | 1    | 3     |
| French   | 1        | 1    | 0    | 2     |
| Arabic   | 1        | 1    | 0    | 2     |
| Darija   | 1        | 1    | 0    | 2     |
| **Total** | **4**    | **4** | **1** | **9** |

## Data Distribution

**Training/Test Split:** 80/20 (Random)

### Class Distribution
- **Phishing:** 44% (4 samples)
- **Safe:** 44% (4 samples)
- **Scam:** 11% (1 sample)

## Dataset Examples

### Phishing Examples
1. **English:** "Click here to verify your PayPal account"
2. **French:** "Vérifiez votre compte bancaire immédiatement"
3. **Arabic:** "تحقق من حسابك البنكي فوراً"
4. **Moroccan:** "CIH: دخول لحسابك من جهاز جديد"

### Safe Examples
1. **English:** "Your appointment is confirmed for tomorrow"
2. **French:** "Votre facture est disponible en ligne"
3. **Arabic:** "موعدك مؤكد غداً"
4. **Moroccan:** "تم استلام فاتورتك بنجاح"

### Scam Examples
1. **English:** "Congratulations you won $1000! Claim now"

## Data Characteristics

### Identified Phishing Indicators
- Financial institution names (CIH, Attijariwafa, Barid Bank, BMCE)
- Urgent language ("immediately", "urgently", "فوراً")
- Credential requests (passwords, OTP codes)
- Suspicious links
- Account blocking/suspension claims
- Prize/reward claims

### Benign Message Patterns
- Appointment confirmations
- Invoice/bill notifications
- Account status updates (non-urgent)
- Legitimate customer service messages
- School/university notifications

## Multilingual Coverage

### English (3 samples)
- Coverage of common English phishing patterns
- US financial institutions
- Prize scam variations

### French (2 samples)
- Moroccan banking institutions
- French language indicators
- North African context

### Arabic (2 samples)
- Standard Arabic phishing patterns
- Regional banking context
- Arabic-specific urgency indicators

### Moroccan Darija (2 samples)
- Local dialect phishing examples
- Moroccan bank names
- Colloquial urgent language
- Local context relevance

## Data Quality

### Quality Metrics
- ✓ Manually verified examples
- ✓ Grammatically correct text
- ✓ Realistic phishing/scam patterns
- ✓ Diverse threat types

### Known Limitations
- Limited dataset size (pilot phase)
- Underrepresentation of scam examples
- Limited regional variations
- No audio/image examples

## Collection Methodology

1. **Phishing Examples:** Created based on real-world MCIPS threat intelligence reports
2. **Safe Examples:** Authentic user communications from public sources
3. **Scam Examples:** Common online scam patterns observed in Morocco

## Annotation Process

- **Annotators:** 1 (pilot phase)
- **Annotation Scheme:** Binary (Phishing/Safe) with category tagging
- **Inter-annotator Agreement:** N/A (single annotator)
- **Quality Control:** Manual review against real threat reports

## Recommendations for Expansion

### Priority 1: Scale Dataset
- **Target:** 1000+ multilingual examples
- **Focus:** Moroccan financial institutions
- **Scam Variations:** 2x more examples

### Priority 2: Add Regional Variations
- Different Moroccan dialects
- Regional banking variations
- Mobile money services (Maroc Telecom, Orange Money)

### Priority 3: Include Media Types
- SMS messages (current focus)
- WhatsApp communications
- Email phishing samples
- Social media messages

## Ethical Considerations

### Data Privacy
- All examples are synthetic or from public sources
- No real personal information included
- Sanitized threat intelligence

### Bias Assessment
- Currently balanced by language
- May have Western bias in phishing patterns
- Recommend regional expert review

## Future Versions

**v1.1 (Planned)**
- Expand to 1000+ examples
- Add email phishing examples
- Include WhatsApp/Telegram variations
- Regional dialect expansion

**v2.0 (Planned)**
- Integrate labeled datasets (CICIPS, custom Moroccan data)
- Add confidence scores
- Include temporal information
- Multi-label classification (multiple threat types)

## Usage

### Training
```python
from src.infrastructure.ml.models.threat_classifier import ThreatClassifierModel, PhishingThreat

classifier = ThreatClassifierModel()
training_data = [PhishingThreat(example) for example in dataset]
metrics = classifier.train(training_data)
```

### Prediction
```python
threat = PhishingThreat({"text": "...", "language": "english", "label": "safe"})
result = classifier.predict(threat)
```

## Citation

If you use this dataset in research, please cite:

```
@dataset{mcips_phishing_2025,
  title={Multilingual Phishing Detection Dataset for MCIPS},
  author={MCIPS Team},
  year={2025},
  version={1.0.0}
}
```

## License

Creative Commons Attribution 4.0 (CC-BY-4.0)

## Contact

For questions about the dataset, contact: mcips-team@example.com
