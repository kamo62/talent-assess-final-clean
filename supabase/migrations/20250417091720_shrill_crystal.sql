/*
  # Add First Code Assessment

  1. Data Changes
    - Insert a new case study for finding non-repeating characters
    - Type: programming
    - Difficulty: medium
    - Description: Includes problem statement, examples, and solution approach

  2. Notes
    - Content is formatted in Markdown for proper rendering in the UI
    - Includes clear examples and expected outputs
*/

INSERT INTO case_studies (title, description, type, difficulty)
VALUES (
  'Code Assessment 1: Find First Non-Repeating Character',
  E'## Problem Statement\n\nWrite a function that takes a string input and returns the first character that does not repeat. If all characters are repeated, return an indicator like ''None'' or ''_''.\n\n## Examples\n\n```\nInput: "swiss"\nOutput: "w"\nExplanation: ''s'' repeats, but ''w'' is the first non-repeating character\n\nInput: "aabbcc"\nOutput: "_"\nExplanation: All characters repeat, so we return "_"\n\nInput: "abcdef"\nOutput: "a"\nExplanation: No characters repeat, so we return the first character\n```\n\n## Requirements\n\n1. Function should be case-sensitive (''A'' and ''a'' are different characters)\n2. Consider spaces and special characters as valid characters\n3. Empty strings should return "_"\n4. The solution should handle strings of any length\n\n## Solution Approach\n\nTo solve this problem efficiently, you should:\n\n1. Create a data structure to store character frequencies\n2. Traverse the string once to count occurrences\n3. Traverse the string again to find the first character with count 1\n4. Return appropriate result based on findings\n\n## Example Implementation Structure\n\n```javascript\nfunction findFirstNonRepeating(str) {\n  // Your implementation here\n}\n\n// Test cases\nconsole.log(findFirstNonRepeating("swiss"))     // Should print: "w"\nconsole.log(findFirstNonRepeating("aabbcc"))    // Should print: "_"\nconsole.log(findFirstNonRepeating("abcdef"))    // Should print: "a"\n```\n\n## Evaluation Criteria\n\nYour solution will be evaluated based on:\n\n1. Correctness: Handles all test cases correctly\n2. Efficiency: Uses appropriate data structures and algorithms\n3. Code Style: Clear, readable, and well-documented code\n4. Edge Cases: Properly handles empty strings and special characters\n\n## Additional Challenges\n\nOnce you have a working solution, consider these extensions:\n\n1. Optimize for space complexity\n2. Handle Unicode characters\n3. Process the string in a single pass\n4. Implement a streaming version that processes characters one at a time\n\nGood luck!',
  'programming',
  'medium'
);