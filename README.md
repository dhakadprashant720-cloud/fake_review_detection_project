🛡️ Fake Review Detection System
🔍 AI-Powered Chrome Extension for Real-Time Amazon Review Analysis



🎥 Demo < link of YouTube video>

👉 Live Demo (Deployed API)
🔗 https://amazon-fake-reviews-detection.onrender.com

👉 Demo Video (Recommended)
(Add your Loom/YouTube link here)

📸 Screenshots
🔹 Extension UI

🔹 Review Analysis Result

🔹 Non-Amazon Warning

(Tip: Save your screenshots in an assets/ folder in repo)

🚀 Problem Statement

Over 90% of users rely on reviews before buying a product.
But fake reviews are manipulating decisions, reducing trust, and harming users.

❌ No real-time tools for users
❌ Existing systems are not accessible
❌ No browser-level solution

👉 This project solves it.

✨ Features
🔍 Real-time review detection
⚡ Fast ML predictions (sub-second)
🌐 Chrome Extension integration
📊 Smart dashboard with insights
🧠 NLP-based classification
🎯 User-friendly verdict system


🧠 How It Works
<img width="2689" height="129" alt="mermaid-diagram" src="https://github.com/user-attachments/assets/a9222cd8-4707-4555-a98e-164e98ac07c7" />

🏗️ Architecture
<img width="586" height="720" alt="mermaid-diagram (1)" src="https://github.com/user-attachments/assets/74316544-511e-47e5-9da8-d6a665d2856d" />

🧪 Machine Learning Pipeline
🔹 Preprocessing
Lowercasing
Noise removal
Tokenization (NLTK)
Stopword removal
🔹 Feature Engineering
TF-IDF Vectorization
🔹 Model
Custom Logistic Regression
Gradient Descent Training

📊 Performance
| Metric    | Score   |
| --------- | ------- |
| Accuracy  | **84%** |
| Precision | 0.84    |
| Recall    | 0.84    |
| F1-Score  | 0.84    |

✔ Balanced + fast
✔ Optimized for real-time usage

🖥️ UI Preview
Verdict System

| Fake % | Verdict                 |
| ------ | ----------------------- |
| < 20%  | ✅ Mostly Genuine       |
| 20–49% | ⚠️ Proceed with Caution |
| ≥ 50%  | ❌ High Fake Activity   |


📂 Project Structure

<img width="198" height="321" alt="Screenshot 2026-05-06 at 10 12 41 PM" src="https://github.com/user-attachments/assets/40f4e49d-543b-477e-acf1-39d74e0b0f49" />



⚙️ Installation
1️⃣ Clone Repo
git clone https://github.com/your-username/fake-review-detector.git
cd fake-review-detector

2️⃣ Setup Backend
pip install -r requirements.txt
python app.py

3️⃣ Load Extension
Go to chrome://extensions/
Enable Developer Mode
Click Load Unpacked
Select extension/ folder

🌍 Deployment
Backend → Render
Local → http://127.0.0.1:5000


⚠️ Limitations
English-only reviews
Amazon-only support
No behavioral analysis
Struggles with sarcasm
🔮 Future Scope
🤖 BERT / Transformer models
🌐 Multilingual support
🛒 Flipkart / eBay integration
📱 Mobile app
🧠 Behavioral analytics
🤝 Contributing

Contributions are welcome!
Feel free to fork, improve, and submit a PR 🚀

👩‍💻 Author 1
Anshima Singh
💻 CSE Student | ML + Backend Developer


👩‍💻 Author 2
Anshima Singh
💻 CSE Student | ML + Backend Developer

⭐ Show Your Support

If you like this project:

👉 Star ⭐ the repo

👉 Share it on LinkedIn






