"""Fills the team's answer-key sheet (columns K–P) from benchmark/benchmark.json → benchmark/answer_key_filled.xlsx."""
import json, glob, openpyxl
src = glob.glob("data/yahia/TenderScale answer key*.xlsx") + glob.glob("benchmark/*answer key*.xlsx")
if not src: raise SystemExit("answer key xlsx not found")
wb = openpyxl.load_workbook(src[0]); ws = wb.worksheets[0]
res = {r["engine"]: r for r in json.load(open("benchmark/benchmark.json"))["results"]}
cols = {"nebius": (11, 12, 13), "closed": (14, 15, 16)}
for row in ws.iter_rows(min_row=2):
    qid = row[0].value
    for eng, (ca, cf, cs) in cols.items():
        r = res.get(eng)
        if not r: continue
        s = next((x for x in r["scored"] if x["id"] == qid), None)
        if s: ws.cell(row=row[0].row, column=ca, value=s["answer"]); ws.cell(row=row[0].row, column=cf, value=s["flag"]); ws.cell(row=row[0].row, column=cs, value=s["score"])
        elif qid == "Time per questionnaire (s)": ws.cell(row=row[0].row, column=ca - 9, value=round(r["seconds"], 1))
        elif qid == "Cost per questionnaire (EUR)": ws.cell(row=row[0].row, column=ca - 9, value=round(r["eur"], 3))
wb.save("benchmark/answer_key_filled.xlsx"); print("wrote benchmark/answer_key_filled.xlsx")
