.PHONY: all clean test

BUILDDIR ?= $(abspath ../build)
OBJDIR ?= $(abspath ../obj)
SRCDIR := $(CURDIR)/src
SOURCES := $(SRCDIR)/worker.c $(SRCDIR)/container_stage.c

LIBS := hiredis yyjson

CC := clang
CFLAGS += -I../ $(shell pkg-config --cflags $(LIBS))
LDLIBS := $(OBJDIR)/hiredis_client.o $(shell pkg-config --libs $(LIBS)) -lm

all: $(BUILDDIR)/worker

$(BUILDDIR)/worker: $(SOURCES) $(SRCDIR)/container_stage.h
	mkdir -p $(BUILDDIR)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $(SOURCES) $(LDLIBS)

test:
	sh tests/run.sh

clean:
	rm -f $(BUILDDIR)/worker
