.PHONY: all clean

BUILDDIR ?= $(abspath ../build)
OBJDIR ?= $(abspath ../obj)
SRCDIR := $(CURDIR)/src
INCLUDEDIR := $(CURDIR)/include

LIBS := hiredis yyjson

CC := clang
CFLAGS += -isystem$(INCLUDEDIR) -I../ $(shell pkg-config --cflags $(LIBS))
LDLIBS := $(OBJDIR)/hiredis_client.o $(shell pkg-config --libs $(LIBS)) -lm

all: $(BUILDDIR)/backend

$(BUILDDIR)/backend: $(SRCDIR)/backend.c $(INCLUDEDIR)/fio-stl.h
	mkdir -p $(BUILDDIR)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LDLIBS)

clean:
	rm -f $(BUILDDIR)/backend
