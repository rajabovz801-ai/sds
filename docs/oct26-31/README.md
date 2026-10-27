# Challenge Reading and Vocabulary — 26–31 October 2026

Imported the twelve user-supplied PDFs into the existing ark60 tables. No application, student record, payment, access, grading or retention code was changed.

| Day | Practice 1 | Practice 2 | Words |
|---|---|---|---:|
| 26 | Dust and the American West | Dyes and fabric dyeing | 80 |
| 27 | Effects of changes in world population | Farmers | 80 |
| 28 | First Memories | Game theory | 80 |
| 29 | The early history of olive oil | Evolution of the Calculator | 80 |
| 30 | Flood control in the USA | Growing food in cities | 80 |
| 31 | Global warming in New Zealand | How a prehistoric predator took to the skies | 80 |

There are 160 questions, 24 vocabulary units of 20 terms (pass mark 18) and 480 vocabulary terms. Each term includes an Uzbek meaning, English definition and a literal contextual example. CEFR labels are approximate pedagogical classifications, not certified ratings.

Verified original PDFs, including all four scanned olive-oil pages; reconstructed paragraph boundaries across pages. Corrected the calculator question-range typo (7–16 to 7–13), the flood heading instruction (six A–F paragraphs), the duplicated urban-food paragraph segment, and unambiguous olive-oil typing/OCR artifacts. Answer explanations cite actual paragraph text; paired answers are order-independent without double credit, using the existing grader.

The population passage is intentionally repeated from day 23 because it was among the supplied PDFs and the user specified this order. Its vocabulary list is new. Compared candidate lemma and generated family keys with all 2,520 existing terms. Exact source presence and unique Uzbek meanings within each quiz were checked. Generated database keys were verified using the existing ark60_vocab_family function; no schema or function changes were made.

Published all six days atomically only after verifying 12 passages, 24 complete units, 480 terms, answer/evidence counts and quote presence. Database constraints enforce globally unique lemma and family keys. Earlier content was not updated.

Validation: local content verifier passed; database integrity checks returned zero invalid unit counts, missing evidence quotes, mismatched question/key/analysis counts or empty vocabulary fields. Existing professional-reading layout tests: 2 passed. No live student submission was created; a signed-in browser walkthrough was not performed in this run.

Rollback: unpublish only the twelve imported passage IDs and 24 imported unit IDs; retain rows and any attempts. Do not delete or modify historical learner results. JSON snapshots and QA summary in this directory identify the exact batch.
