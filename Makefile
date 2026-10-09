SERVICES := backend worker
.PHONY: all clean common $(SERVICES)

export CFLAGS := -std=c23 -Wall -Wextra

export BUILDDIR := $(CURDIR)/build
export OBJDIR := $(CURDIR)/obj

all: common $(SERVICES)

common:
	$(MAKE) -C $@

$(SERVICES): common
	$(MAKE) -C $@

clean:
	rm -rf $(BUILDDIR) $(OBJDIR)
