const natural = require('natural');
const path = require('path');
const fs = require('fs');

const { trainingData } = require("./trainingData")

const MODEL_FILE = path.join(__dirname, 'invoice_classifier.json');

// Top-level singleton
let classifierInstance = null;

function getClassifier() {
    return new Promise((resolve, reject) => {
        if (classifierInstance) {
            return resolve(classifierInstance);
        }

        // 2. If it's not in memory, check if the file exists on disk
        if (fs.existsSync(MODEL_FILE)) {
            natural.BayesClassifier.load(MODEL_FILE, null, (err, loadedClassifier) => {
                if (err) return reject(err);

                classifierInstance = loadedClassifier;
                resolve(classifierInstance);
            });
        } else {
            // 3. If no file exists, create a fresh one
            classifierInstance = new natural.BayesClassifier();
            resolve(classifierInstance);
        }
    });
}


function saveClassifier() {
    if (!classifierInstance) return;

    classifierInstance.save(MODEL_FILE, (err) => {
        if (err) console.error("Failed to save model:", err);
        else console.log("Model saved to disk.");
    });
}

function trainAndSave() {
    classifierInstance = new natural.BayesClassifier();

    trainingData.forEach(category => {
        category.phrases.forEach(phrase => {
            classifierInstance.addDocument(phrase, category.label);
        });
    });

    classifierInstance.train();
    saveClassifier();

}

function classify(word) {
    if (!classifierInstance) {
        return 'unclassified';
    }
    return { label: classifierInstance.classify(word), classifications: classifierInstance.getClassifications(word) };
}


// trainAndSave();

module.exports = {
    getClassifier,
    saveClassifier,
    classify
};