.PHONY: all clean

BUILDDIR ?= $(abspath ../build)
OBJDIR ?= $(abspath ../obj)
SRCDIR := $(CURDIR)/src

LIBS := hiredis yyjson

CC := clang
CFLAGS += -I../ $(shell pkg-config --cflags $(LIBS))
LDLIBS := $(OBJDIR)/hiredis_client.o $(shell pkg-config --libs $(LIBS)) -lm

all: $(BUILDDIR)/worker

$(BUILDDIR)/worker: $(SRCDIR)/worker.c
	mkdir -p $(BUILDDIR)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LDLIBS)

clean:
	rm -f $(BUILDDIR)/worker
