import pandas as pd
import json
import os

def convert_excel_to_json(excel_file_path, output_file_path):
    """
    Konwertuje plik Excel z pytaniami na format JSON.
    
    Format Excel:
    - Kolumna A: pytania i odpowiedzi
    - Kolumna B: "x" przy prawidłowych odpowiedziach
    """
    
    try:
        # Wczytaj plik Excel
        df = pd.read_excel(excel_file_path, header=None)
        
        questions = []
        i = 0
        while i < len(df):
            # Pobierz pytanie
            cell_a = str(df.iloc[i, 0]).strip() if pd.notna(df.iloc[i, 0]) else ""
            if not cell_a:
                i += 1
                continue  # pomiń puste wiersze

            question_text = cell_a
            answers = []
            i += 1

            # Zbieraj odpowiedzi aż do pustej linii
            while i < len(df):
                answer_a = str(df.iloc[i, 0]).strip() if pd.notna(df.iloc[i, 0]) else ""
                answer_b = str(df.iloc[i, 1]).strip() if pd.notna(df.iloc[i, 1]) else ""
                if not answer_a:
                    break  # pusta linia = koniec odpowiedzi
                answer_letter = chr(65 + len(answers))  # A, B, C, D, ...
                answers.append({
                    "letter": answer_letter,
                    "text": answer_a,
                    "correct": (answer_b.lower() == "x")
                })
                i += 1

            # Dodaj pytanie jeśli są odpowiedzi
            if answers:
                questions.append({
                    "question": question_text,
                    "answers": answers,
                    "category": "ogólne"
                })

            # Pomiń kolejne puste linie (zwykle 2)
            while i < len(df) and (not pd.notna(df.iloc[i, 0]) or str(df.iloc[i, 0]).strip() == ""):
                i += 1

        # Zapisz do pliku JSON
        with open(output_file_path, 'w', encoding='utf-8') as f:
            json.dump({
                "questions": questions,
                "total_questions": len(questions)
            }, f, ensure_ascii=False, indent=2)
        
        print(f"Pomyślnie przekonwertowano {len(questions)} pytań do pliku {output_file_path}")
        return questions
        
    except Exception as e:
        print(f"Błąd podczas konwersji: {str(e)}")
        return None

def preview_excel_structure(excel_file_path):
    """
    Podgląd struktury pliku Excel
    """
    try:
        df = pd.read_excel(excel_file_path, header=None)
        print("Podgląd struktury pliku Excel:")
        print("=" * 50)
        for i, row in df.head(20).iterrows():
            cell_a = str(row[0]) if pd.notna(row[0]) else ""
            cell_b = str(row[1]) if pd.notna(row[1]) else ""
            print(f"Wiersz {i+1}: A='{cell_a}' | B='{cell_b}'")
        print("=" * 50)
    except Exception as e:
        print(f"Błąd podczas podglądu: {str(e)}")

if __name__ == "__main__":
    # Przykład użycia
    excel_file = "az900_big.xlsx"  # Zmień na nazwę swojego pliku
    json_file = "az900_big.json"
    
    # Sprawdź czy plik Excel istnieje
    if os.path.exists(excel_file):
        print(f"Znaleziono plik: {excel_file}")
        preview_excel_structure(excel_file)
        
        # Konwertuj
        questions = convert_excel_to_json(excel_file, json_file)
        
        if questions:
            print(f"\nPrzykład pierwszego pytania:")
            if questions:
                q = questions[0]
                print(f"Pytanie: {q['question']}")
                for answer in q['answers']:
                    correct_mark = " ✓" if answer['correct'] else ""
                    print(f"  {answer['letter']}) {answer['text']}{correct_mark}")
    else:
        print(f"Plik {excel_file} nie został znaleziony.")
        print("Upewnij się, że plik Excel znajduje się w tym samym katalogu co skrypt.")
        print("Lub zmień nazwę pliku w zmiennej 'excel_file'.") 