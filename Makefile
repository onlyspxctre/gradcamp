SUBDIRS := common backend
.PHONY: all clean $(SUBDIRS)

export CFLAGS := -std=c23 -Wall -Wextra

export BUILDDIR := $(CURDIR)/build
export OBJDIR := $(CURDIR)/obj

all: $(SUBDIRS)

$(SUBDIRS): common
	$(MAKE) -C $@
