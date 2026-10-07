SUBDIRS := common backend
.PHONY: all clean $(SUBDIRS)

export BUILDDIR := $(CURDIR)/build
export OBJDIR := $(CURDIR)/obj

all: $(SUBDIRS)

$(SUBDIRS):
	$(MAKE) -C $@
