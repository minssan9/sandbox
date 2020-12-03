package com.codility;

import sun.reflect.generics.tree.Tree;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;

public class BTrightSideView {
    public List<Integer> rightSideView(TreeNode root){
        List<Integer> ret = new ArrayList<>();
        if(root==null) return ret;
        Queue<TreeNode > q = new LinkedList<>();
        q.offer(root);

        while (!q.isEmpty()) {
            int size = q.size();
            for ( int i = 0; i< size; i++){
                TreeNode  cur = q.poll();
                if(i==size-1) ret.add(cur.val);
                if(cur.right!=null) q.offer(cur.right);
            }

        }
        return  ret;
    }


}
