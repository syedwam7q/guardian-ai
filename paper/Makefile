# Build the GuardianAI paper.
#
# Default target: latexmk-driven full build (BibTeX + 2 LaTeX passes).
# Fallback target: pdflatex-only (skips the bibliography pass).

PAPER       := manuscript
LATEXMK     := latexmk
PDFLATEX    := pdflatex
BIBTEX      := bibtex

.PHONY: paper latexmk pdflatex clean veryclean watch

paper: latexmk

latexmk:
	$(LATEXMK) -pdf -interaction=nonstopmode $(PAPER).tex

pdflatex:
	$(PDFLATEX) -interaction=nonstopmode $(PAPER).tex
	$(BIBTEX) $(PAPER) || true
	$(PDFLATEX) -interaction=nonstopmode $(PAPER).tex
	$(PDFLATEX) -interaction=nonstopmode $(PAPER).tex

watch:
	$(LATEXMK) -pdf -pvc -interaction=nonstopmode $(PAPER).tex

clean:
	$(LATEXMK) -c $(PAPER).tex || rm -f $(PAPER).{aux,log,out,bbl,blg,fls,fdb_latexmk,toc,synctex.gz}

veryclean:
	$(LATEXMK) -C $(PAPER).tex || rm -f $(PAPER).{aux,log,out,bbl,blg,fls,fdb_latexmk,toc,synctex.gz,pdf}
