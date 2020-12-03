package com.codility;

import com.codility.ListNode;
import java.util.PriorityQueue;

public class MergekSortedLIst {
    public ListNode mergeKLists(ListNode[] lists) {
        ListNode ret = null;
        PriorityQueue<ListNode> pq = new PriorityQueue<>(lists.length, (a,b)-> a.val-b.val);

        for(ListNode node: lists){
            if(node ==null) continue;
            pq.offer(node);
        }

//        while (lists[i].) {
//            lists[i].next;
//            pq.add(lists[i].val);
//        }

        pq.comparator();
//        pq.compareTo()
//        for(int j=0;j< pq.size();j++){
//            ret.add(pq.poll());
//        }
        return ret;
    }


}
