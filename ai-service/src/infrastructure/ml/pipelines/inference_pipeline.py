from infrastructure.ml.models.threat_classifier import ThreatClassifierService
from infrastructure.ml.models.threat_classifier import PhishingThreat
class InferencePipeline:

    def __init__(self):
        self.ThreatClassifier = ThreatClassifierService()

    
    def predict(self,data:PhishingThreat):
        txt = self.ThreatClassifier.vectorizer.transform([data.text])
        prediction=self.ThreatClassifier.model.predict(txt)
        if(prediction[0]==1):
            prediction="phishing"
        else:            
            prediction="safe"
        conf=self.ThreatClassifier.model.predict_proba(txt).max()
        return {"prediction": prediction, "confidence": conf}