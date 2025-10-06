"""
Image Data Preprocessing Module
Handles preprocessing of water quality images for CNN
"""

import os
import numpy as np
import pandas as pd
import cv2
from PIL import Image
import json
from sklearn.model_selection import train_test_split
from tensorflow.keras.preprocessing.image import ImageDataGenerator

class ImageDataPreprocessor:
    def __init__(self, data_dir='../../datasets', img_size=(224, 224)):
        self.data_dir = data_dir
        self.img_size = img_size
        self.image_paths = []
        self.labels = []
        
    def load_images_from_dataset(self):
        """Load images from Fishpond Visual Condition Dataset"""
        image_dir = os.path.join(
            self.data_dir, 
            'Fishpond Visual Condition Dataset', 
            'Fishpond Visual Condition Dataset', 
            'images'
        )
        
        csv_path = os.path.join(
            self.data_dir, 
            'Fishpond Visual Condition Dataset', 
            'Fishpond Visual Condition Dataset', 
            'pond_dataset.csv'
        )
        
        print(f"Loading images from: {image_dir}")
        
        # Load CSV to get labels if available
        labels_dict = {}
        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            print(f"CSV columns: {df.columns.tolist()}")
            
            # Try to find image filename and label columns
            for idx, row in df.iterrows():
                # Adjust these column names based on actual CSV structure
                img_name = None
                label = None
                
                # Common column name patterns
                for col in df.columns:
                    if 'image' in col.lower() or 'filename' in col.lower() or 'name' in col.lower():
                        img_name = str(row[col])
                    if 'quality' in col.lower() or 'status' in col.lower() or 'label' in col.lower():
                        label = row[col]
                
                if img_name and label:
                    labels_dict[img_name] = label
        
        # Load all images
        if os.path.exists(image_dir):
            for img_file in os.listdir(image_dir):
                if img_file.endswith(('.jpg', '.jpeg', '.png')):
                    img_path = os.path.join(image_dir, img_file)
                    self.image_paths.append(img_path)
                    
                    # Assign label if available, otherwise use filename pattern or default
                    if img_file in labels_dict:
                        self.labels.append(labels_dict[img_file])
                    else:
                        # Default labeling strategy based on image characteristics
                        self.labels.append('Unknown')
        
        print(f"Loaded {len(self.image_paths)} images")
        return self.image_paths, self.labels
    
    def analyze_image_quality(self, img_path):
        """Analyze image and determine water quality based on visual features"""
        img = cv2.imread(img_path)
        
        if img is None:
            return 'Unknown'
        
        # Convert to different color spaces
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculate features
        # 1. Color analysis (green indicates algae)
        green_mask = cv2.inRange(hsv, (40, 40, 40), (80, 255, 255))
        green_ratio = np.sum(green_mask > 0) / (img.shape[0] * img.shape[1])
        
        # 2. Turbidity estimation (variance in grayscale)
        turbidity_estimate = np.var(gray) / 100
        
        # 3. Clarity (edge detection)
        edges = cv2.Canny(gray, 50, 150)
        clarity = np.sum(edges > 0) / (img.shape[0] * img.shape[1])
        
        # Determine quality based on features
        if green_ratio > 0.3 or turbidity_estimate < 5 or clarity < 0.1:
            return 'Unsafe'
        else:
            return 'Safe'
    
    def auto_label_images(self):
        """Automatically label images based on visual analysis"""
        print("\nAuto-labeling images based on visual features...")
        
        for i, img_path in enumerate(self.image_paths):
            if self.labels[i] == 'Unknown':
                self.labels[i] = self.analyze_image_quality(img_path)
        
        print(f"Label distribution: {pd.Series(self.labels).value_counts().to_dict()}")
    
    def load_and_preprocess_image(self, img_path):
        """Load and preprocess a single image"""
        # Load image
        img = Image.open(img_path).convert('RGB')
        
        # Resize
        img = img.resize(self.img_size)
        
        # Convert to array and normalize
        img_array = np.array(img) / 255.0
        
        return img_array
    
    def preprocess_all_images(self):
        """Preprocess all images"""
        print("\nPreprocessing images...")
        
        X = []
        y = []
        
        for img_path, label in zip(self.image_paths, self.labels):
            try:
                img_array = self.load_and_preprocess_image(img_path)
                X.append(img_array)
                y.append(1 if label == 'Safe' else 0)  # Binary classification
            except Exception as e:
                print(f"Error processing {img_path}: {e}")
        
        X = np.array(X)
        y = np.array(y)
        
        print(f"Preprocessed images shape: {X.shape}")
        print(f"Labels shape: {y.shape}")
        print(f"Safe: {np.sum(y == 1)}, Unsafe: {np.sum(y == 0)}")
        
        return X, y
    
    def create_data_augmentation(self):
        """Create data augmentation generator"""
        datagen = ImageDataGenerator(
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            horizontal_flip=True,
            vertical_flip=True,
            zoom_range=0.2,
            fill_mode='nearest'
        )
        return datagen
    
    def save_image_metadata(self, save_dir='../saved_models'):
        """Save image preprocessing metadata"""
        os.makedirs(save_dir, exist_ok=True)
        
        metadata = {
            'img_size': self.img_size,
            'num_images': len(self.image_paths),
            'label_distribution': pd.Series(self.labels).value_counts().to_dict()
        }
        
        with open(os.path.join(save_dir, 'image_metadata.json'), 'w') as f:
            json.dump(metadata, f, indent=4)
        
        print(f"Image metadata saved to {save_dir}")
    
    def preprocess_pipeline(self, test_size=0.2):
        """Complete image preprocessing pipeline"""
        print("="*50)
        print("Starting Image Data Preprocessing Pipeline")
        print("="*50)
        
        # Load images
        self.load_images_from_dataset()
        
        # Auto-label unknown images
        self.auto_label_images()
        
        # Preprocess images
        X, y = self.preprocess_all_images()
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        print(f"\nTraining images: {X_train.shape}")
        print(f"Testing images: {X_test.shape}")
        
        # Save metadata
        self.save_image_metadata()
        
        # Create augmentation generator
        datagen = self.create_data_augmentation()
        
        return {
            'X_train': X_train,
            'X_test': X_test,
            'y_train': y_train,
            'y_test': y_test,
            'datagen': datagen,
            'img_size': self.img_size
        }

if __name__ == '__main__':
    preprocessor = ImageDataPreprocessor()
    data = preprocessor.preprocess_pipeline()
    
    print("\n" + "="*50)
    print("Image Preprocessing Complete!")
    print("="*50)

