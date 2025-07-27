#!/usr/bin/env python3
"""
Prepare training data for MedGemma fine-tuning
Converts JSONL dataset into format ready for Hugging Face training
"""

import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple
import random
from collections import defaultdict

def load_jsonl(filepath: Path) -> List[Dict]:
    """Load JSONL file"""
    data = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            data.append(json.loads(line.strip()))
    return data

def format_for_training(entry: Dict) -> Dict:
    """Format entry for MedGemma training"""
    # MedGemma expects specific format
    formatted = {
        "image_path": entry["image_path"],
        "conversations": [
            {
                "from": "human",
                "value": entry["prompt"]
            },
            {
                "from": "gpt", 
                "value": entry["response"]
            }
        ],
        "metadata": entry["metadata"]
    }
    return formatted

def balance_dataset(data: List[Dict], max_per_category: int = None) -> List[Dict]:
    """Balance dataset by category"""
    category_groups = defaultdict(list)
    
    # Group by category
    for entry in data:
        category = entry["metadata"]["category"]
        category_groups[category].append(entry)
    
    # Balance if needed
    if max_per_category:
        balanced_data = []
        for category, entries in category_groups.items():
            if len(entries) > max_per_category:
                sampled = random.sample(entries, max_per_category)
                balanced_data.extend(sampled)
            else:
                balanced_data.extend(entries)
        return balanced_data
    
    return data

def augment_prompts(entry: Dict) -> List[Dict]:
    """Create augmented versions with different prompts"""
    base_entry = entry.copy()
    augmented = [base_entry]
    
    # Alternative prompts
    alternative_prompts = [
        "Analyze this endoscopic image and describe any pathological findings.",
        "What abnormalities can you identify in this endoscopy image? Provide clinical assessment.",
        "Examine this endoscopic image for lesions. Include classification and recommendations.",
        "Perform a detailed analysis of this endoscopy image, noting any concerning features."
    ]
    
    # Only augment entries with actual findings
    if entry["metadata"]["category"] != "normal" and entry["metadata"]["has_annotations"]:
        for alt_prompt in alternative_prompts[:2]:  # Use 2 augmentations
            aug_entry = entry.copy()
            aug_entry["prompt"] = aug_entry["prompt"].replace(
                "Analyze this endoscopic image and provide a detailed clinical assessment.",
                alt_prompt
            )
            augmented.append(aug_entry)
    
    return augmented

def prepare_dataset(
    input_file: Path,
    output_dir: Path,
    augment: bool = False,
    balance: bool = False,
    max_per_category: int = None
) -> Tuple[int, int]:
    """Prepare dataset for training"""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Load data
    print(f"Loading data from {input_file}...")
    data = load_jsonl(input_file)
    print(f"Loaded {len(data)} entries")
    
    # Balance if requested
    if balance:
        print("Balancing dataset...")
        data = balance_dataset(data, max_per_category)
        print(f"Balanced to {len(data)} entries")
    
    # Augment if requested
    if augment:
        print("Augmenting dataset...")
        augmented_data = []
        for entry in data:
            augmented_data.extend(augment_prompts(entry))
        data = augmented_data
        print(f"Augmented to {len(data)} entries")
    
    # Format for training
    print("Formatting for MedGemma training...")
    formatted_data = [format_for_training(entry) for entry in data]
    
    # Shuffle
    random.shuffle(formatted_data)
    
    # Save formatted data
    output_file = output_dir / f"{input_file.stem}_formatted.jsonl"
    with open(output_file, 'w', encoding='utf-8') as f:
        for entry in formatted_data:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
    
    print(f"Saved formatted data to {output_file}")
    
    # Generate statistics
    stats = {
        "total_entries": len(formatted_data),
        "unique_images": len(set(entry["image_path"] for entry in formatted_data)),
        "category_distribution": defaultdict(int),
        "metadata_summary": {
            "age_distribution": defaultdict(int),
            "sex_distribution": defaultdict(int),
            "procedure_types": defaultdict(int)
        }
    }
    
    for entry in formatted_data:
        meta = entry["metadata"]
        stats["category_distribution"][meta["category"]] += 1
        stats["metadata_summary"]["age_distribution"][meta["age_range"]] += 1
        stats["metadata_summary"]["sex_distribution"][meta["sex"]] += 1
        if meta.get("procedure_type"):
            stats["metadata_summary"]["procedure_types"][meta["procedure_type"]] += 1
    
    # Save statistics
    stats_file = output_dir / f"{input_file.stem}_stats.json"
    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump(dict(stats), f, indent=2)
    
    print(f"\nDataset Statistics:")
    print(f"  Total entries: {stats['total_entries']}")
    print(f"  Unique images: {stats['unique_images']}")
    print(f"  Categories: {dict(stats['category_distribution'])}")
    
    return stats["total_entries"], stats["unique_images"]

def main():
    parser = argparse.ArgumentParser(description="Prepare MedGemma training data")
    parser.add_argument("input_file", type=Path, help="Input JSONL file")
    parser.add_argument("--output-dir", type=Path, default=Path("./data/training_ready"),
                       help="Output directory")
    parser.add_argument("--augment", action="store_true",
                       help="Augment dataset with alternative prompts")
    parser.add_argument("--balance", action="store_true",
                       help="Balance dataset by category")
    parser.add_argument("--max-per-category", type=int,
                       help="Maximum samples per category when balancing")
    
    args = parser.parse_args()
    
    if not args.input_file.exists():
        print(f"Error: Input file {args.input_file} not found")
        return
    
    prepare_dataset(
        args.input_file,
        args.output_dir,
        args.augment,
        args.balance,
        args.max_per_category
    )

if __name__ == "__main__":
    main()