from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import pandas as pd

label_mapping={
    "phishing": 1,
    "safe": 0
}
lan_mapping={
    "english": 0,
    "french": 1,
    "arabic": 2,
    "darija": 3
}
class PhishingThreat():
    def __init__(self, data:any):
        self.text=str(data["text"].lower())
        self.label=label_mapping[str(data["label"].lower().strip())]
        self.language=lan_mapping[str(data["language"].lower().strip())]        


class ThreatClassifierService():
    def __init__(self):
        self.model = LogisticRegression()
        self.vectorizer = TfidfVectorizer()
        
    def train(self,data:list[PhishingThreat]):
        labels=[d.label for d in data]
        texts=[d.text for d in data]
        X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=42)
        X_train = self.vectorizer.fit_transform(X_train)
        X_test = self.vectorizer.transform(X_test)
        self.model.fit(X_train, y_train)
        accuracy=self.model.score(X_test, y_test)
        return {"accuracy": accuracy}
    

d=pd.read_csv("data.csv")
d=d.apply(lambda x: PhishingThreat(x), axis=1)
d=list(d)
test1={"text": "Attijariwafa Bank: Your OTP code is 482931. Do not share this code with anyone. If you did not request it, contact customer support.", "language": "English", "label": "safe"}
test2={"text": "CIH Bank: A login to your account was detected from a new device. Click the link below immediately to verify your account.", "language": "English", "label": "phishing"}    
verif=ThreatClassifierService()    
print(verif.train(d))
print(verif.predict(PhishingThreat(test2)))
print(verif.predict(PhishingThreat(test1)))

