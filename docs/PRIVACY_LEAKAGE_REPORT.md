# Privacy Leakage Report

## Method

`backend/src/tests/privacy-red-team-corpus.json` contains representative leakage probes for JWTs, API keys, Moroccan IBAN/RIB values, IPv6 addresses, defanged URLs, expanded Moroccan phone numbers, and Moroccan identity numbers. `privacy-sanitizer.test.ts` runs each probe through the active sanitizer and records leakage totals by category.

## Current Totals

| Category | Leakage Count |
|---|---:|
| jwt | 0 |
| api_key | 0 |
| moroccan_iban | 0 |
| rib | 0 |
| ipv6 | 0 |
| defanged_url | 0 |
| moroccan_phone | 0 |
| moroccan_identity | 0 |

## Caveat

This is a red-team corpus, not proof of complete privacy protection. New formats should be added whenever new collectors or payload fields are introduced.
