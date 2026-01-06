#!/usr/bin/env python3
"""
Script to extract the first row (header) from a CSV file
and output it as a JavaScript array.
"""

import csv
import os

# Get the directory
script_dir = os.path.dirname(os.path.abspath(__file__))
csv_file = os.path.join(script_dir, "Disease and symptoms dataset.csv")

# Read the CSV file and extract the header
with open(csv_file, 'r', encoding='utf-8') as file:
    reader = csv.reader(file)
    header = next(reader)  # Get the first row

# Format as JavaScript array
js_array = "[\n"
for i, column in enumerate(header):
    # Escape quotes and wrap in quotes
    escaped_column = column.replace('"', '\\"')
    js_array += f'  "{escaped_column}"'
    if i < len(header) - 1:
        js_array += ","
    js_array += "\n"
js_array += "]"

# Print the result
print(js_array)

# save to a file
output_file = os.path.join(script_dir, "header.js")
with open(output_file, 'w', encoding='utf-8') as f:
    f.write("// CSV Header as JavaScript Array\n")
    f.write("export const csvHeader = " + js_array + ";\n")
    f.write("\n// Or as a simple array:\n")
    f.write("const csvHeaderArray = " + js_array + ";\n")

print(f"\n✓ Header extracted successfully!")
print(f"✓ Saved to: {output_file}")
