.PHONY: all clean

OBJDIR ?= $(abspath ./obj)

LIBS := hiredis

CC := clang
CFLAGS += $(shell pkg-config --cflags $(LIBS))
LDFLAGS := -fuse-ld=mold
LDLIBS := $(shell pkg-config --libs $(LIBS)) -lm

all: $(OBJDIR)/hiredis_client.o

$(OBJDIR)/hiredis_client.o: $(CURDIR)/hiredis_client.c
	mkdir -p $(OBJDIR)
	$(CC) $(CFLAGS) -c -o $@ $<

clean:
	rm -f $(OBJDIR)/hiredis_client.o
