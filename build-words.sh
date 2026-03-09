#!/bin/bash
BASE="https://raw.githubusercontent.com/darija-open-dataset/dataset/master"
FILES=(
  "syntactic%20categories/nouns.csv"
  "syntactic%20categories/verbs.csv"
  "syntactic%20categories/adjectives.csv"
  "semantic%20categories/food.csv"
  "semantic%20categories/animals.csv"
  "semantic%20categories/clothes.csv"
  "semantic%20categories/colors.csv"
  "semantic%20categories/emotions.csv"
  "semantic%20categories/family.csv"
  "semantic%20categories/places.csv"
  "semantic%20categories/professions.csv"
  "semantic%20categories/humanbody.csv"
)

VALID_CHARS="^[a-z2379]+$"

words=()
for f in "${FILES[@]}"; do
  while IFS=, read -r n1 rest; do
    w=$(echo "$n1" | tr '[:upper:]' '[:lower:]' | xargs)
    if [[ ${#w} -eq 5 ]] && [[ "$w" =~ $VALID_CHARS ]] && [[ "$w" != "n1" ]]; then
      words+=("$w")
    fi
  done < <(curl -sL "$BASE/$f")
done

sorted=($(printf '%s\n' "${words[@]}" | sort -u))

echo "const WORDS = ["
for ((i=0; i<${#sorted[@]}; i++)); do
  if (( i % 5 == 0 )); then printf "  "; fi
  printf "'%s'" "${sorted[$i]}"
  if (( i < ${#sorted[@]} - 1 )); then printf ", "; fi
  if (( (i+1) % 5 == 0 )); then printf "\n"; fi
done
if (( ${#sorted[@]} % 5 != 0 )); then printf "\n"; fi
echo "];"
echo ""
echo "Found ${#sorted[@]} words" >&2
