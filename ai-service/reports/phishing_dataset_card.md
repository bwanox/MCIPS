# MCIPS 34-Sample Pilot Dataset Card

## Dataset

- **File:** `ai-service/reports/data.csv`
- **Version:** `1.0.0-pilot`
- **Task:** phishing-versus-safe message classification
- **Size:** 34 examples
- **Labels:** 17 phishing, 17 safe
- **Languages:** English 12, French 8, Arabic 8, Darija 6

## Collection And Construction

The corpus is repository-owned and curated for a competition prototype. Examples are synthetic or manually curated to cover Moroccan banking impersonation, urgency, OTP lures, suspicious URLs, and benign account/appointment notifications.

## Evaluation Use

The dataset is used only for a reproducible pilot benchmark:

- Five-fold stratified out-of-fold evaluation
- No production-readiness claims
- No per-language accuracy claims beyond listing sample counts

## Known Limitations

- Very small sample size
- Not sampled from live production traffic
- Limited organization, device, channel, and attacker diversity
- No image, voice, attachment, or long email coverage
- Requires a much larger labeled validation set before production use

## Privacy

The dataset is designed to avoid real personal information. Any future real-world expansion must pass the MCIPS sanitizer and store privacy-safe hashes or indicators instead of raw sensitive content.
