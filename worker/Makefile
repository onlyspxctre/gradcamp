.PHONY: all clean

BUILDDIR ?= $(abspath ../build)
OBJDIR ?= $(abspath ../obj)
SRCDIR := $(CURDIR)/src

LIBS := hiredis yyjson

CC := clang
CFLAGS += -I../ $(shell pkg-config --cflags $(LIBS))
COMMON_OBJ := $(OBJDIR)/hiredis_client.o
COMMON_HDR := $(abspath ../common/hiredis_client.h)
LDLIBS := $(COMMON_OBJ) $(shell pkg-config --libs $(LIBS)) -lm

all: $(BUILDDIR)/worker

$(BUILDDIR)/worker: $(SRCDIR)/worker.c $(COMMON_HDR) $(COMMON_OBJ)
	mkdir -p $(BUILDDIR)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LDLIBS)

clean:
	rm -f $(BUILDDIR)/worker
