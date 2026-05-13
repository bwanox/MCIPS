
STEP 1
FastAPI route
    create central settings file(centralize all variables and constants)

→ use case
→ application service
→ local rule-based classifier
→ clean inference responses
STEP 2
define allowed threat labels
define allowed risk levels
aka setup enums
STEP 3
define internal business objects -> work with meaningful bojects instead of raw data
STEP 4
define request/response models used by FASTAPI
define contracts between FASTAPI and application service
STEP 5
define the response to health endpoint
STEP 6
normalize input texts before classification
STEP 7
Create the detection engine
STEP 8
Create the use cases that runs inference
STEP 9
Create a function that builds the use case aka dependency injection
STEP 10
defining health endpoint and interface root