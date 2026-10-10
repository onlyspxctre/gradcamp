.PHONY: all clean

BUILDDIR ?= $(abspath ../build)
OBJDIR ?= $(abspath ../obj)
SRCDIR := $(CURDIR)/src
INCLUDEDIR := $(CURDIR)/include
DEPSDIR := $(CURDIR)/deps

FIO_STL_VERSION := 24a5701
FIO_STL_DIR := $(DEPSDIR)/fio-stl.h-$(FIO_STL_VERSION)

LIBS := hiredis yyjson

CC := clang
CFLAGS += -isystem$(INCLUDEDIR) -I../ $(shell pkg-config --cflags $(LIBS))
LDLIBS := $(OBJDIR)/hiredis_client.o $(shell pkg-config --libs $(LIBS)) -lm

all: $(BUILDDIR)/backend

$(BUILDDIR)/backend: $(SRCDIR)/backend.c $(INCLUDEDIR)/fio-stl.h
	mkdir -p $(BUILDDIR)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LDLIBS)

$(INCLUDEDIR)/fio-stl.h: $(FIO_STL_DIR).tar.gz
	mkdir -p $(INCLUDEDIR)
	cp $(FIO_STL_DIR)/fio-stl.h $@

$(FIO_STL_DIR).tar.gz:
	mkdir -p $(FIO_STL_DIR)
	curl -fsSL -o $(FIO_STL_DIR).tar.gz https://github.com/facil-io/cstl/archive/$(FIO_STL_VERSION).tar.gz
	tar xf $(FIO_STL_DIR).tar.gz -C $(FIO_STL_DIR) --strip-components=1

clean:
	rm -f $(BUILDDIR)/backend
	rm -rf $(INCLUDEDIR)
