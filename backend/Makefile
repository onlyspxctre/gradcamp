.PHONY: all clean

SRCDIR := $(abspath ./src)
INCLUDEDIR := $(abspath ./include)
BUILDDIR := $(abspath ./build)

LIBS := hiredis yyjson

CC := clang
CFLAGS := -Wall -Wextra -isystem$(INCLUDEDIR) $(shell pkg-config --cflags $(LIBS))
LDFLAGS := -fuse-ld=mold
LDLIBS := $(shell pkg-config --libs $(LIBS)) -lm

all: $(BUILDDIR)/backend

$(BUILDDIR)/backend: $(SRCDIR)/backend.c $(INCLUDEDIR)/fio-stl.h
	mkdir -p $(BUILDDIR)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $(SRCDIR)/backend.c $(LDLIBS)
