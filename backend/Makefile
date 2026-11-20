.PHONY: all clean

BUILDDIR ?= $(abspath ../build)
OBJDIR ?= $(abspath ../obj)
SRCDIR := $(CURDIR)/src
INCLUDEDIR := $(CURDIR)/include
DEPSDIR := $(CURDIR)/deps

FIO_STL_VERSION := 24a5701
FIO_STL_ARCHIVE := $(DEPSDIR)/fio-stl.h-$(FIO_STL_VERSION).tar.gz

LIBS := hiredis yyjson

CC := clang
CFLAGS += -isystem$(INCLUDEDIR) -I../ $(shell pkg-config --cflags $(LIBS))
COMMON_OBJ := $(OBJDIR)/hiredis_client.o
COMMON_HDR := $(abspath ../common/hiredis_client.h)
LDLIBS := $(COMMON_OBJ) $(shell pkg-config --libs $(LIBS)) -lm

all: $(BUILDDIR)/backend

$(BUILDDIR)/backend: $(SRCDIR)/backend.c $(INCLUDEDIR)/fio-stl.h $(COMMON_HDR) $(COMMON_OBJ)
	mkdir -p $(BUILDDIR)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LDLIBS)

$(INCLUDEDIR)/fio-stl.h: $(FIO_STL_ARCHIVE)
	mkdir -p "$(@D)"
	tar -xOzf "$<" --wildcards --no-wildcards-match-slash 'cstl-*/fio-stl.h' > "$@.tmp"
	mv "$@.tmp" "$@"

$(FIO_STL_ARCHIVE):
	mkdir -p "$(@D)"
	curl -fsSL -o "$@.tmp" https://github.com/facil-io/cstl/archive/$(FIO_STL_VERSION).tar.gz
	mv "$@.tmp" "$@"

clean:
	rm -f $(BUILDDIR)/backend
	rm -rf $(INCLUDEDIR)
