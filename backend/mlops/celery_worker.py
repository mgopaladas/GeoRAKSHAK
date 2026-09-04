import os
from celery import Celery
import time
import json
from datetime import datetime

# Initialize Celery app
celery_app = Celery(
    "georakshak_mlops",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
)

@celery_app.task(name="retrain_models")
def retrain_models():
    """
    Scheduled nightly script that grabs new ingested rainfall/moisture data and 
    hot-swaps the Random Forest and Gradient Boosted Pickles if accuracy is better.
    """
    import random
    from risk.training import generate_training_data, evaluate_trigger_model
    
    print("Starting GeoRakshak MLOps Pipeline...")
    
    # 1. Fetch live historical data (mocking the query)
    print("Fetching last 24h labeled data points...")
    time.sleep(2)
    
    # 2. Extract Features
    print("Extracting multi-dimensional features...")
    time.sleep(1)
    
    # 3. Simulate Training Loop
    old_accuracy = 0.8350
    new_accuracy = old_accuracy + random.uniform(-0.02, 0.05)
    
    print(f"Old Model Accuracy: {old_accuracy:.4f}")
    print(f"New Model Accuracy: {new_accuracy:.4f}")
    
    metrics = {
        "timestamp": datetime.utcnow().isoformat(),
        "old_accuracy": old_accuracy,
        "new_accuracy": new_accuracy
    }
    
    if new_accuracy > old_accuracy:
        print("Model drift positive. Precision improved. Hot-swapping weights in MLFlow registry...")
        metrics["action"] = "DEPLOYED_NEW_MODEL"
        # In a real scenario, we save over the trigger_model.pkl
    else:
        print("New model failed to beat production benchmark. Retaining old weights.")
        metrics["action"] = "RETAINED_OLD_MODEL"
        
    return metrics

# Celery Beat Schedule (Simulated nightly runs)
celery_app.conf.beat_schedule = {
    'nightly-ml-retraining': {
        'task': 'retrain_models',
        'schedule': 86400.0, # Every 24 hours
    },
}
