SERVICES := backend worker
.PHONY: all clean common $(SERVICES) benchmark

export CFLAGS := -std=c23 -Wall -Wextra

export BUILDDIR := $(CURDIR)/build
export OBJDIR := $(CURDIR)/obj

all: common $(SERVICES)

common:
	$(MAKE) -C $@

$(SERVICES): common
	$(MAKE) -C $@

benchmark:
	python3 scripts/benchmark.py --runs 5

clean:
	rm -rf $(BUILDDIR) $(OBJDIR)

