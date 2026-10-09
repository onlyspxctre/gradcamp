import type { Problem } from "@/types"

export const MOCK_PROBLEMS: Problem[] = [
  {
    id: "1",
    numericId: 1,
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    category: "Algorithms",
    tags: ["Array", "Hash Table"],
    acceptance: "53.1%",
    totalSubmissions: "12.4M",
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        id: 1,
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        id: 2,
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
      },
      {
        id: 3,
        input: "nums = [3,3], target = 6",
        output: "[0,1]",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    hints: [
      "A really brute force way would be to search for all possible pairs of numbers but that would be slow. Again, it's best to try out brute force solutions for just for completeness, which is O(N^2).",
      "So, if we check the number nums[i], we are looking for target - nums[i]. Can we use a hash table to check if target - nums[i] already appeared in O(1) time?",
    ],
    starterCodes: {
      c: `/**
 * Note: The returned array must be malloced, assume caller calls free().
 */
int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    *returnSize = 2;
    int* result = (int*)malloc(2 * sizeof(int));
    
    // TODO: Implement your solution here
    for (int i = 0; i < numsSize; i++) {
        for (int j = i + 1; j < numsSize; j++) {
            if (nums[i] + nums[j] == target) {
                result[0] = i;
                result[1] = j;
                return result;
            }
        }
    }
    
    return result;
}`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); ++i) {
            int complement = target - nums[i];
            if (seen.find(complement) != seen.end()) {
                return {seen[complement], i};
            }
            seen[nums[i]] = i;
        }
        return {};
    }
};`,
      python: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
};`,
      rust: `impl Solution {
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        use std::collections::HashMap;
        let mut map = HashMap::new();
        for (i, &num) in nums.iter().enumerate() {
            let complement = target - num;
            if let Some(&prev_idx) = map.get(&complement) {
                return vec![prev_idx as i32, i as i32];
            }
            map.insert(num, i);
        }
        vec![]
    }
}`,
      go: `func twoSum(nums []int, target int) []int {
    seen := make(map[int]int)
    for i, num := range nums {
        if j, ok := seen[target-num]; ok {
            return []int{j, i}
        }
        seen[num] = i
    }
    return nil
}`,
    },
    testCases: [
      {
        id: "tc-1",
        name: "Case 1",
        input: "nums = [2,7,11,15]\ntarget = 9",
        expectedOutput: "[0, 1]",
      },
      {
        id: "tc-2",
        name: "Case 2",
        input: "nums = [3,2,4]\ntarget = 6",
        expectedOutput: "[1, 2]",
      },
      {
        id: "tc-3",
        name: "Case 3",
        input: "nums = [3,3]\ntarget = 6",
        expectedOutput: "[0, 1]",
      },
    ],
    solutionExplanation: {
      approach: "Hash Map Lookup (One-pass)",
      complexity: {
        time: "O(N) - We traverse the list containing N elements exactly once. Each lookup in the hash map takes O(1) time.",
        space:
          "O(N) - The extra space required depends on the number of items stored in the hash table, which stores at most N elements.",
      },
      codeSnippet: `// One pass hash map solution
for (int i = 0; i < n; i++) {
    int complement = target - nums[i];
    if (map_contains(map, complement)) {
        return make_pair(map_get(map, complement), i);
    }
    map_put(map, nums[i], i);
}`,
    },
  },
  {
    id: "2",
    numericId: 2,
    title: "Invert Binary Tree",
    slug: "invert-binary-tree",
    difficulty: "Easy",
    category: "Trees",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    acceptance: "78.2%",
    totalSubmissions: "4.1M",
    description: `Given the root of a binary tree, invert the tree, and return its root.

Each node's left child becomes its right child, and vice versa recursively throughout the entire subtree.`,
    examples: [
      {
        id: 1,
        input: "root = [4,2,7,1,3,6,9]",
        output: "[4,7,2,9,6,3,1]",
      },
      {
        id: 2,
        input: "root = [2,1,3]",
        output: "[2,3,1]",
      },
      {
        id: 3,
        input: "root = []",
        output: "[]",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 100].",
      "-100 <= Node.val <= 100",
    ],
    hints: [
      "Think recursively: what should happen to the left and right pointers of the current node?",
      "Swap the left and right subtrees, then invert them recursively.",
    ],
    starterCodes: {
      c: `/**
 * Definition for a binary tree node.
 * struct TreeNode {
 *     int val;
 *     struct TreeNode *left;
 *     struct TreeNode *right;
 * };
 */
struct TreeNode* invertTree(struct TreeNode* root) {
    if (root == NULL) return NULL;
    
    struct TreeNode* temp = root->left;
    root->left = invertTree(root->right);
    root->right = invertTree(temp);
    
    return root;
}`,
      cpp: `class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        if (!root) return nullptr;
        std::swap(root->left, root->right);
        invertTree(root->left);
        invertTree(root->right);
        return root;
    }
};`,
      python: `class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        if not root:
            return None
        root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)
        return root`,
      javascript: `var invertTree = function(root) {
    if (!root) return null;
    const temp = root.left;
    root.left = invertTree(root.right);
    root.right = invertTree(temp);
    return root;
};`,
      rust: `// Definition for a binary tree node
impl Solution {
    pub fn invert_tree(root: Option<Rc<RefCell<TreeNode>>>) -> Option<Rc<RefCell<TreeNode>>> {
        root.map(|node| {
            let left = node.borrow().left.clone();
            let right = node.borrow().right.clone();
            node.borrow_mut().left = Self::invert_tree(right);
            node.borrow_mut().right = Self::invert_tree(left);
            node
        })
    }
}`,
      go: `func invertTree(root *TreeNode) *TreeNode {
    if root == nil {
        return nil
    }
    root.Left, root.Right = invertTree(root.Right), invertTree(root.Left)
    return root
}`,
    },
    testCases: [
      {
        id: "tc-1",
        name: "Case 1",
        input: "root = [4,2,7,1,3,6,9]",
        expectedOutput: "[4,7,2,9,6,3,1]",
      },
      {
        id: "tc-2",
        name: "Case 2",
        input: "root = [2,1,3]",
        expectedOutput: "[2,3,1]",
      },
    ],
  },
  {
    id: "3",
    numericId: 146,
    title: "LRU Cache",
    slug: "lru-cache",
    difficulty: "Medium",
    category: "Design & Systems",
    tags: ["Hash Table", "Linked List", "Design", "Doubly-Linked List"],
    acceptance: "44.8%",
    totalSubmissions: "2.8M",
    description: `Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.

Implement the \`LRUCache\` class:
- \`LRUCache(int capacity)\` Initialize the LRU cache with positive size capacity.
- \`int get(int key)\` Return the value of the \`key\` if the key exists, otherwise return \`-1\`.
- \`void put(int key, int value)\` Update the value of the \`key\` if the \`key\` exists. Otherwise, add the \`key-value\` pair to the cache. If the number of keys exceeds the \`capacity\` from this operation, evict the least recently used key.

The functions \`get\` and \`put\` must each run in **O(1)** average time complexity.`,
    examples: [
      {
        id: 1,
        input: `["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]
[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]`,
        output: "[null, null, null, 1, null, -1, null, -1, 3, 4]",
        explanation: `LRUCache lRUCache = new LRUCache(2);
lRUCache.put(1, 1); // cache is {1=1}
lRUCache.put(2, 2); // cache is {1=1, 2=2}
lRUCache.get(1);    // return 1
lRUCache.put(3, 3); // LRU key was 2, evicts key 2, cache is {1=1, 3=3}
lRUCache.get(2);    // returns -1 (not found)
lRUCache.put(4, 4); // LRU key was 1, evicts key 1, cache is {4=4, 3=3}
lRUCache.get(1);    // return -1 (not found)
lRUCache.get(3);    // return 3
lRUCache.get(4);    // return 4`,
      },
    ],
    constraints: [
      "1 <= capacity <= 3000",
      "0 <= key <= 10^4",
      "0 <= value <= 10^5",
      "At most 2 * 10^5 calls will be made to get and put.",
    ],
    hints: [
      "How can we achieve O(1) operations for both lookup and eviction?",
      "Consider combining a hash table for fast lookups with a doubly linked list for maintaining LRU ordering.",
    ],
    starterCodes: {
      c: `typedef struct {
    int capacity;
    int size;
    // TODO: Define doubly linked list and hash map nodes
} LRUCache;

LRUCache* lRUCacheCreate(int capacity) {
    LRUCache* obj = (LRUCache*)malloc(sizeof(LRUCache));
    obj->capacity = capacity;
    obj->size = 0;
    return obj;
}

int lRUCacheGet(LRUCache* obj, int key) {
    // TODO: Return value or -1
    return -1;
}

void lRUCachePut(LRUCache* obj, int key, int value) {
    // TODO: Insert or update key, evict if over capacity
}

void lRUCacheFree(LRUCache* obj) {
    free(obj);
}`,
      cpp: `class LRUCache {
public:
    LRUCache(int capacity) {
        
    }
    
    int get(int key) {
        return -1;
    }
    
    void put(int key, int value) {
        
    }
};`,
      python: `class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}

    def get(self, key: int) -> int:
        return self.cache.get(key, -1)

    def put(self, key: int, value: int) -> None:
        pass`,
      javascript: `var LRUCache = function(capacity) {
    this.capacity = capacity;
    this.map = new Map();
};

LRUCache.prototype.get = function(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val);
    return val;
};

LRUCache.prototype.put = function(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
        const firstKey = this.map.keys().next().value;
        this.map.delete(firstKey);
    }
};`,
      rust: `struct LRUCache {
    capacity: usize,
}

impl LRUCache {
    fn new(capacity: i32) -> Self {
        LRUCache { capacity: capacity as usize }
    }
    fn get(&mut self, key: i32) -> i32 { -1 }
    fn put(&mut self, key: i32, value: i32) {}
}`,
      go: `type LRUCache struct {
    capacity int
}

func Constructor(capacity int) LRUCache {
    return LRUCache{capacity: capacity}
}

func (this *LRUCache) Get(key int) int {
    return -1
}

func (this *LRUCache) Put(key int, value int) {
}`,
    },
    testCases: [
      {
        id: "tc-1",
        name: "Case 1",
        input:
          'capacity = 2\noperations = ["put(1,1)", "put(2,2)", "get(1)", "put(3,3)", "get(2)"]',
        expectedOutput: "[null, null, 1, null, -1]",
      },
    ],
  },
  {
    id: "4",
    numericId: 4,
    title: "Median of Two Sorted Arrays",
    slug: "median-of-two-sorted-arrays",
    difficulty: "Hard",
    category: "Algorithms",
    tags: ["Array", "Binary Search", "Divide and Conquer"],
    acceptance: "40.6%",
    totalSubmissions: "3.5M",
    description: `Given two sorted arrays \`nums1\` and \`nums2\` of size \`m\` and \`n\` respectively, return the **median** of the two sorted arrays.

The overall run time complexity should be **O(log (m+n))**.`,
    examples: [
      {
        id: 1,
        input: "nums1 = [1,3], nums2 = [2]",
        output: "2.00000",
        explanation: "merged array = [1,2,3] and median is 2.",
      },
      {
        id: 2,
        input: "nums1 = [1,2], nums2 = [3,4]",
        output: "2.50000",
        explanation:
          "merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.",
      },
    ],
    constraints: [
      "nums1.length == m",
      "nums2.length == n",
      "0 <= m <= 1000",
      "0 <= n <= 1000",
      "1 <= m + n <= 2000",
      "-10^6 <= nums1[i], nums2[i] <= 10^6",
    ],
    hints: [
      "The problem requires O(log(m+n)) time complexity. This suggests a binary search approach.",
      "Can you partition both arrays simultaneously so that the left half contains half of all elements?",
    ],
    starterCodes: {
      c: `double findMedianSortedArrays(int* nums1, int nums1Size, int* nums2, int nums2Size) {
    // TODO: Implement O(log(min(m, n))) binary search partition
    return 0.0;
}`,
      cpp: `class Solution {
public:
    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
        return 0.0;
    }
};`,
      python: `class Solution:
    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:
        return 0.0`,
      javascript: `var findMedianSortedArrays = function(nums1, nums2) {
    return 0.0;
};`,
      rust: `impl Solution {
    pub fn find_median_sorted_arrays(nums1: Vec<i32>, nums2: Vec<i32>) -> f64 {
        0.0
    }
}`,
      go: `func findMedianSortedArrays(nums1 []int, nums2 []int) float64 {
    return 0.0
}`,
    },
    testCases: [
      {
        id: "tc-1",
        name: "Case 1",
        input: "nums1 = [1, 3]\nnums2 = [2]",
        expectedOutput: "2.00000",
      },
      {
        id: "tc-2",
        name: "Case 2",
        input: "nums1 = [1, 2]\nnums2 = [3, 4]",
        expectedOutput: "2.50000",
      },
    ],
  },
  {
    id: "5",
    numericId: 206,
    title: "Reverse Linked List",
    slug: "reverse-linked-list",
    difficulty: "Easy",
    category: "Linked List",
    tags: ["Linked List", "Recursion"],
    acceptance: "77.5%",
    totalSubmissions: "6.2M",
    description: `Given the \`head\` of a singly linked list, reverse the list, and return the reversed list.`,
    examples: [
      {
        id: 1,
        input: "head = [1,2,3,4,5]",
        output: "[5,4,3,2,1]",
      },
      {
        id: 2,
        input: "head = [1,2]",
        output: "[2,1]",
      },
    ],
    constraints: [
      "The number of nodes in the list is the range [0, 5000].",
      "-5000 <= Node.val <= 5000",
    ],
    hints: [
      "A linked list can be reversed either iteratively or recursively. Could you implement both?",
    ],
    starterCodes: {
      c: `/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     struct ListNode *next;
 * };
 */
struct ListNode* reverseList(struct ListNode* head) {
    struct ListNode* prev = NULL;
    struct ListNode* curr = head;
    while (curr != NULL) {
        struct ListNode* nextTemp = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nextTemp;
    }
    return prev;
}`,
      cpp: `class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        ListNode* prev = nullptr;
        ListNode* curr = head;
        while (curr) {
            ListNode* nxt = curr->next;
            curr->next = prev;
            prev = curr;
            curr = nxt;
        }
        return prev;
    }
};`,
      python: `class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        prev, curr = None, head
        while curr:
            nxt = curr.next
            curr.next = prev
            prev = curr
            curr = nxt
        return prev`,
      javascript: `var reverseList = function(head) {
    let prev = null;
    let curr = head;
    while (curr) {
        const nextTemp = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nextTemp;
    }
    return prev;
};`,
      rust: `impl Solution {
    pub fn reverse_list(head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
        let mut prev = None;
        let mut curr = head;
        while let Some(mut node) = curr {
            curr = node.next.take();
            node.next = prev;
            prev = Some(node);
        }
        prev
    }
}`,
      go: `func reverseList(head *ListNode) *ListNode {
    var prev *ListNode
    curr := head
    for curr != nil {
        nextTemp := curr.Next
        curr.Next = prev
        prev = curr
        curr = nextTemp
    }
    return prev
}`,
    },
    testCases: [
      {
        id: "tc-1",
        name: "Case 1",
        input: "head = [1,2,3,4,5]",
        expectedOutput: "[5,4,3,2,1]",
      },
    ],
  },
  {
    id: "6",
    numericId: 790,
    title: "Parallel Matrix Multiplication in C",
    slug: "parallel-matrix-multiplication",
    difficulty: "Hard",
    category: "Systems & Concurrency",
    tags: ["C Systems", "POSIX Threads", "SIMD", "Cache Optimization"],
    acceptance: "32.1%",
    totalSubmissions: "420K",
    description: `Implement high-performance multi-threaded matrix multiplication in C using POSIX Threads (\`pthread\`).

Given two square matrices $A$ and $B$ of dimension $N \\times N$, compute their product $C = A \\times B$.
Your implementation must pass memory leak checks (Valgrind), respect cache locality (tiling/blocking), and scale across CPU cores.

The evaluation microVM will benchmark your runtime against optimized BLAS.`,
    examples: [
      {
        id: 1,
        input:
          "N = 4\nA = [[1, 2, 3, 4], [5, 6, 7, 8], ...]\nB = [[9, 8, 7, 6], ...]",
        output: "Matrix C validated within precision margin eps = 1e-6",
        explanation: "All 3 tests passed inside Gradcamp microVM sandbox.",
      },
    ],
    constraints: [
      "N is a power of 2, 64 <= N <= 2048",
      "Thread pool must use at most 4 worker threads",
      "Memory limit: 256MB",
      "Time limit: 2.0s",
    ],
    hints: [
      "Loop ordering matters for cache misses. Consider i-k-j loop ordering instead of standard i-j-k.",
      "Partition matrix into tiles fitting into L1/L2 cache lines.",
    ],
    starterCodes: {
      c: `#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

void matrix_multiply_parallel(const double *A, const double *B, double *C, int n, int num_threads) {
    // TODO: Distribute work across num_threads workers
    for (int i = 0; i < n; i++) {
        for (int k = 0; k < n; k++) {
            for (int j = 0; j < n; j++) {
                C[i * n + j] += A[i * n + k] * B[k * n + j];
            }
        }
    }
}`,
      cpp: `#include <vector>
#include <thread>

void matrixMultiplyParallel(const std::vector<double>& A, const std::vector<double>& B, std::vector<double>& C, int n) {
    // TODO: Parallel matrix multiply
}`,
      python: `def matrix_multiply(A, B, n):
    # Python baseline
    pass`,
      javascript: `function matrixMultiply(A, B, n) {
    // JS baseline
}`,
      rust: `pub fn matrix_multiply(a: &[f64], b: &[f64], c: &mut [f64], n: usize) {
    // Rust SIMD / Rayon implementation
}`,
      go: `func MatrixMultiply(a, b, c []float64, n int) {
    // Go concurrent implementation
}`,
    },
    testCases: [
      {
        id: "tc-1",
        name: "Dimension N=64",
        input: "N = 64, Threads = 4",
        expectedOutput: "C Correct (Checksum: 0x94A2)",
      },
      {
        id: "tc-2",
        name: "Dimension N=256",
        input: "N = 256, Threads = 4",
        expectedOutput: "C Correct (Checksum: 0xFD4B)",
      },
      {
        id: "tc-3",
        name: "Dimension N=1024 (Stress)",
        input: "N = 1024, Threads = 4",
        expectedOutput: "C Correct (Runtime < 350ms)",
      },
    ],
  },
]
