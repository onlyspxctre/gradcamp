.PHONY: all clean backend

export BUILDDIR := $(CURDIR)/build
export OBJDIR := $(CURDIR)/obj

all: common backend

common:
	$(MAKE) -C common

backend: common
	$(MAKE) -C backend
