PY ?= python3
.PHONY: all layout check viewer serve overlay clean
all: layout check viewer
layout:            ## regenerate layout.json (runs collision + invariant gates)
	$(PY) gen_layout.py
check:             ## independent invariant audit of layout.json
	$(PY) tools/check_invariants.py
viewer:            ## bundle the self-contained viewer into dist/viewer.html
	$(PY) build_viewer.py
view-%:            ## locked-camera render page, e.g. make view-refaerial
	$(PY) build_viewer.py dist/$*.html $*
serve: viewer      ## http://localhost:8000/dist/viewer.html
	$(PY) -m http.server 8000
overlay:           ## project current footprints onto ref_04
	$(PY) tools/overlay_ref.py
clean:
	rm -rf dist out
