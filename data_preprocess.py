from google.colab import files
uploaded = files.upload()

import pandas as pd
import numpy as np

data = pd.read_csv('Preprocessed Fake Reviews Detection Dataset.csv.zip')
print(data.head())

data.head()



data.drop(['rating'],axis=1,inplace=True)
data.head()



data = data.rename(columns={'text_': 'text'})
print("Column 'text_' renamed to 'text'. Here's the updated head of the DataFrame:")
data.head()

data. drop(['Unnamed: 0'],axis=1,inplace=True)
data.head()

data.drop('category', axis=1, inplace=True)
data.head()

data['text'] = data['text'].str.lower()
data.head()

data

import string
data['text'] = data['text'].str.translate(str.maketrans('', '', string.punctuation))
data.head()

import nltk
from nltk.tokenize import word_tokenize

# Download the 'punkt' tokenizer if not already present
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

# Explicitly download 'punkt_tab' if not already present, as suggested by the error
try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt_tab')

# Apply word_tokenize to each text entry in the 'text' column, handling non-string values
data['text'] = data['text'].astype(str).apply(word_tokenize)
print(data.head())

data

data.drop('text',axis=1,inplace=True)
data.head()

data=data.rename(columns={'tokenized_text':'text'})
data.head()

import os
os.makedirs("/content/my_project/data", exist_ok=True)


