package com.codility;


public class SumofLeftLeaves {

    int retSum=0;
    public int sumOfLeftLeaves(TreeNode root) {
        if(root == null) return 0;
        if (root!=null )isLeafNode(root);
        return retSum ;
    }


    public boolean isLeafNode(TreeNode root){
        TreeNode left= root.left;
        TreeNode right=root.right;
        if (root.left==null && root.right==null){
            retSum=root.val;
            return true;
        }else if(root.left!=null){
            isLeafNode(left);
        }else if(root.right!=null){
            isLeafNode(right);
        }
        return false;
    }
}
