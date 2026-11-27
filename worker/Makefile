.PHONY: all clean test

BUILDDIR ?= $(abspath ../build)
OBJDIR ?= $(abspath ../obj)
SRCDIR := $(CURDIR)/src

LIBS := hiredis yyjson

CC := clang
CFLAGS += -I../ $(shell pkg-config --cflags $(LIBS))
COMMON_OBJ := $(OBJDIR)/hiredis_client.o
COMMON_HDRS := $(abspath ../common/hiredis_client.h ../common/questions.h)
LDLIBS := $(COMMON_OBJ) $(shell pkg-config --libs $(LIBS)) -lm

all: $(BUILDDIR)/worker

$(BUILDDIR)/worker: $(SRCDIR)/worker.c $(COMMON_HDRS) $(COMMON_OBJ)
	mkdir -p $(BUILDDIR)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LDLIBS)

test: $(BUILDDIR)/container_identity_test $(BUILDDIR)/scratch_cleanup_test
	$(BUILDDIR)/container_identity_test
	$(BUILDDIR)/scratch_cleanup_test

$(BUILDDIR)/container_identity_test: tests/container_identity_test.c $(SRCDIR)/worker.c $(COMMON_HDRS) $(COMMON_OBJ)
	mkdir -p $(BUILDDIR)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(LDLIBS)

$(BUILDDIR)/scratch_cleanup_test: tests/scratch_cleanup_test.c $(SRCDIR)/worker.c $(COMMON_HDRS)
	mkdir -p $(BUILDDIR)
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $< $(shell pkg-config --libs $(LIBS)) -lm

clean:
	rm -f $(BUILDDIR)/worker $(BUILDDIR)/container_identity_test $(BUILDDIR)/scratch_cleanup_test
