#ifndef GRADCAMP_QUESTIONS_H
#define GRADCAMP_QUESTIONS_H

#include <stddef.h>
#include <string.h>

struct grading_question {
    const char *id;
    const char *directory;
};

static inline const struct grading_question *find_grading_question(const char *id, size_t len) {
    // Only this registry supplies directory names for the worker's bind mounts.
    static const struct grading_question questions[] = {
        {"0", "0000-0000-add-two-integers"},
        {"1", "0000-0001-largest-of-three"},
        {"2", "0000-0002-count-digits"},
        {"3", "0000-0003-count-occurrences"},
    };

    if (!id) return NULL;
    for (size_t i = 0; i < sizeof(questions) / sizeof(questions[0]); ++i) {
        if (len == strlen(questions[i].id) && memcmp(id, questions[i].id, len) == 0)
            return &questions[i];
    }
    return NULL;
}

#endif
