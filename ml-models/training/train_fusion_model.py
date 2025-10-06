"""
Training Script for CNN + LSTM Fusion Model
Trains the complete water quality monitoring system
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix
import json
from datetime import datetime

from data_preprocessing.preprocess_sensor_data import SensorDataPreprocessor
from data_preprocessing.preprocess_images import ImageDataPreprocessor
from models.cnn_lstm_fusion import WaterQualityFusionModel, SingleModalityModels

class FusionModelTrainer:
    def __init__(self, data_dir='../../datasets', save_dir='../saved_models'):
        self.data_dir = data_dir
        self.save_dir = save_dir
        os.makedirs(save_dir, exist_ok=True)
        
    def prepare_data(self):
        """Prepare both sensor and image data"""
        print("\n" + "="*60)
        print("STEP 1: DATA PREPARATION")
        print("="*60)
        
        # Preprocess sensor data
        sensor_preprocessor = SensorDataPreprocessor(data_dir=self.data_dir)
        sensor_data = sensor_preprocessor.preprocess_pipeline(sequence_length=10)
        
        # Preprocess image data
        image_preprocessor = ImageDataPreprocessor(data_dir=self.data_dir)
        image_data = image_preprocessor.preprocess_pipeline()
        
        return sensor_data, image_data
    
    def align_datasets(self, sensor_data, image_data):
        """Align sensor and image datasets"""
        print("\n" + "="*60)
        print("STEP 2: ALIGNING DATASETS")
        print("="*60)
        
        # Get sizes
        sensor_train_size = len(sensor_data['X_train'])
        image_train_size = len(image_data['X_train'])
        
        sensor_test_size = len(sensor_data['X_test'])
        image_test_size = len(image_data['X_test'])
        
        print(f"Sensor train samples: {sensor_train_size}")
        print(f"Image train samples: {image_train_size}")
        print(f"Sensor test samples: {sensor_test_size}")
        print(f"Image test samples: {image_test_size}")
        
        # Strategy: Use the SMALLER dataset size to avoid memory issues
        # Downsample the larger dataset instead of repeating the smaller one
        
        # For training data
        if sensor_train_size > image_train_size:
            # Downsample sensor data to match image data
            indices = np.random.choice(sensor_train_size, image_train_size, replace=False)
            X_sensor_train = sensor_data['X_train'][indices]
            y_quality_train = sensor_data['y_quality_train'][indices]
            y_risk_train = sensor_data['y_risk_train'][indices]
            X_image_train = image_data['X_train']
            final_train_size = image_train_size
        else:
            # Downsample image data to match sensor data
            indices = np.random.choice(image_train_size, sensor_train_size, replace=False)
            X_image_train = image_data['X_train'][indices]
            X_sensor_train = sensor_data['X_train']
            y_quality_train = sensor_data['y_quality_train']
            y_risk_train = sensor_data['y_risk_train']
            final_train_size = sensor_train_size
        
        # For test data
        if sensor_test_size > image_test_size:
            # Downsample sensor data to match image data
            indices = np.random.choice(sensor_test_size, image_test_size, replace=False)
            X_sensor_test = sensor_data['X_test'][indices]
            y_quality_test = sensor_data['y_quality_test'][indices]
            y_risk_test = sensor_data['y_risk_test'][indices]
            X_image_test = image_data['X_test']
            final_test_size = image_test_size
        else:
            # Downsample image data to match sensor data
            indices = np.random.choice(image_test_size, sensor_test_size, replace=False)
            X_image_test = image_data['X_test'][indices]
            X_sensor_test = sensor_data['X_test']
            y_quality_test = sensor_data['y_quality_test']
            y_risk_test = sensor_data['y_risk_test']
            final_test_size = sensor_test_size
        
        print(f"\n✓ Aligned train size: {final_train_size}")
        print(f"✓ Aligned test size: {final_test_size}")
        print(f"Strategy: Downsampled larger dataset to avoid memory issues")
        
        return {
            'X_image_train': X_image_train,
            'X_sensor_train': X_sensor_train,
            'X_image_test': X_image_test,
            'X_sensor_test': X_sensor_test,
            'y_quality_train': y_quality_train,
            'y_quality_test': y_quality_test,
            'y_risk_train': y_risk_train,
            'y_risk_test': y_risk_test
        }
    
    def train_fusion_model(self, aligned_data, epochs=50, batch_size=32):
        """Train the fusion model"""
        print("\n" + "="*60)
        print("STEP 3: TRAINING FUSION MODEL")
        print("="*60)
        
        # Build and compile model
        fusion_model = WaterQualityFusionModel(
            img_size=(224, 224),
            sequence_length=aligned_data['X_sensor_train'].shape[1],
            num_features=aligned_data['X_sensor_train'].shape[2]
        )
        
        model = fusion_model.build_fusion_model(
            num_quality_classes=len(np.unique(aligned_data['y_quality_train'])),
            num_risk_classes=len(np.unique(aligned_data['y_risk_train']))
        )
        
        fusion_model.compile_model()
        fusion_model.summary()
        
        # Train model
        history = model.fit(
            {
                'image_input': aligned_data['X_image_train'],
                'sensor_input': aligned_data['X_sensor_train']
            },
            {
                'quality_output': aligned_data['y_quality_train'],
                'risk_output': aligned_data['y_risk_train']
            },
            validation_data=(
                {
                    'image_input': aligned_data['X_image_test'],
                    'sensor_input': aligned_data['X_sensor_test']
                },
                {
                    'quality_output': aligned_data['y_quality_test'],
                    'risk_output': aligned_data['y_risk_test']
                }
            ),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=fusion_model.get_callbacks(self.save_dir),
            verbose=1
        )
        
        return model, history
    
    def evaluate_model(self, model, aligned_data):
        """Evaluate the trained model"""
        print("\n" + "="*60)
        print("STEP 4: MODEL EVALUATION")
        print("="*60)
        
        # Predictions
        predictions = model.predict({
            'image_input': aligned_data['X_image_test'],
            'sensor_input': aligned_data['X_sensor_test']
        })
        
        quality_pred = np.argmax(predictions[0], axis=1)
        risk_pred = np.argmax(predictions[1], axis=1)
        
        # Quality classification report
        print("\n--- Water Quality Classification Report ---")
        print(classification_report(
            aligned_data['y_quality_test'],
            quality_pred,
            target_names=['Unsafe', 'Safe']
        ))
        
        # Risk level classification report
        print("\n--- Risk Level Classification Report ---")
        risk_names = ['Low', 'Medium', 'High']
        unique_risks = np.unique(aligned_data['y_risk_test'])
        risk_labels = [risk_names[i] for i in unique_risks]
        
        print(classification_report(
            aligned_data['y_risk_test'],
            risk_pred,
            target_names=risk_labels
        ))
        
        # Confusion matrices
        self.plot_confusion_matrices(
            aligned_data['y_quality_test'],
            quality_pred,
            aligned_data['y_risk_test'],
            risk_pred
        )
        
        return {
            'quality_predictions': quality_pred,
            'risk_predictions': risk_pred
        }
    
    def plot_confusion_matrices(self, y_quality_true, y_quality_pred, y_risk_true, y_risk_pred):
        """Plot confusion matrices"""
        fig, axes = plt.subplots(1, 2, figsize=(15, 5))
        
        # Quality confusion matrix
        cm_quality = confusion_matrix(y_quality_true, y_quality_pred)
        sns.heatmap(cm_quality, annot=True, fmt='d', cmap='Blues', ax=axes[0],
                   xticklabels=['Unsafe', 'Safe'],
                   yticklabels=['Unsafe', 'Safe'])
        axes[0].set_title('Water Quality Confusion Matrix')
        axes[0].set_ylabel('True Label')
        axes[0].set_xlabel('Predicted Label')
        
        # Risk confusion matrix
        cm_risk = confusion_matrix(y_risk_true, y_risk_pred)
        risk_labels = ['Low', 'Medium', 'High']
        unique_risks = sorted(np.unique(y_risk_true))
        risk_names = [risk_labels[i] for i in unique_risks]
        
        sns.heatmap(cm_risk, annot=True, fmt='d', cmap='Reds', ax=axes[1],
                   xticklabels=risk_names,
                   yticklabels=risk_names)
        axes[1].set_title('Risk Level Confusion Matrix')
        axes[1].set_ylabel('True Label')
        axes[1].set_xlabel('Predicted Label')
        
        plt.tight_layout()
        plt.savefig(os.path.join(self.save_dir, 'confusion_matrices.png'), dpi=300)
        print(f"\nConfusion matrices saved to {self.save_dir}/confusion_matrices.png")
        plt.close()
    
    def plot_training_history(self, history):
        """Plot training history"""
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        
        # Quality accuracy
        axes[0, 0].plot(history.history['quality_output_accuracy'], label='Train')
        axes[0, 0].plot(history.history['val_quality_output_accuracy'], label='Validation')
        axes[0, 0].set_title('Water Quality Accuracy')
        axes[0, 0].set_xlabel('Epoch')
        axes[0, 0].set_ylabel('Accuracy')
        axes[0, 0].legend()
        axes[0, 0].grid(True)
        
        # Quality loss
        axes[0, 1].plot(history.history['quality_output_loss'], label='Train')
        axes[0, 1].plot(history.history['val_quality_output_loss'], label='Validation')
        axes[0, 1].set_title('Water Quality Loss')
        axes[0, 1].set_xlabel('Epoch')
        axes[0, 1].set_ylabel('Loss')
        axes[0, 1].legend()
        axes[0, 1].grid(True)
        
        # Risk accuracy
        axes[1, 0].plot(history.history['risk_output_accuracy'], label='Train')
        axes[1, 0].plot(history.history['val_risk_output_accuracy'], label='Validation')
        axes[1, 0].set_title('Risk Level Accuracy')
        axes[1, 0].set_xlabel('Epoch')
        axes[1, 0].set_ylabel('Accuracy')
        axes[1, 0].legend()
        axes[1, 0].grid(True)
        
        # Risk loss
        axes[1, 1].plot(history.history['risk_output_loss'], label='Train')
        axes[1, 1].plot(history.history['val_risk_output_loss'], label='Validation')
        axes[1, 1].set_title('Risk Level Loss')
        axes[1, 1].set_xlabel('Epoch')
        axes[1, 1].set_ylabel('Loss')
        axes[1, 1].legend()
        axes[1, 1].grid(True)
        
        plt.tight_layout()
        plt.savefig(os.path.join(self.save_dir, 'training_history.png'), dpi=300)
        print(f"Training history saved to {self.save_dir}/training_history.png")
        plt.close()
    
    def save_training_results(self, history, evaluation_results):
        """Save training results and metadata"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'final_quality_accuracy': float(history.history['val_quality_output_accuracy'][-1]),
            'final_risk_accuracy': float(history.history['val_risk_output_accuracy'][-1]),
            'training_epochs': len(history.history['loss']),
        }
        
        with open(os.path.join(self.save_dir, 'training_results.json'), 'w') as f:
            json.dump(results, f, indent=4)
        
        print(f"\nTraining results saved to {self.save_dir}/training_results.json")
    
    def run_complete_pipeline(self, epochs=50, batch_size=32):
        """Run the complete training pipeline"""
        print("\n" + "="*60)
        print("WATER QUALITY MONITORING - TRAINING PIPELINE")
        print("="*60)
        
        # Step 1: Prepare data
        sensor_data, image_data = self.prepare_data()
        
        # Step 2: Align datasets
        aligned_data = self.align_datasets(sensor_data, image_data)
        
        # Step 3: Train model
        model, history = self.train_fusion_model(aligned_data, epochs, batch_size)
        
        # Step 4: Evaluate model
        evaluation_results = self.evaluate_model(model, aligned_data)
        
        # Step 5: Plot results
        self.plot_training_history(history)
        
        # Step 6: Save results
        self.save_training_results(history, evaluation_results)
        
        print("\n" + "="*60)
        print("TRAINING COMPLETE!")
        print("="*60)
        print(f"\nModel saved to: {self.save_dir}/best_fusion_model.h5")
        print(f"Preprocessors saved to: {self.save_dir}/")
        
        return model, history, evaluation_results


if __name__ == '__main__':
    trainer = FusionModelTrainer()
    model, history, results = trainer.run_complete_pipeline(epochs=30, batch_size=16)

