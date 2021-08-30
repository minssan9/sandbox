package com.codility;

import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

public class Array2 {
 
    public int solution(int[] A) {
        
        // write your code in Java SE 8        
        if(A.length%2 !=1)return 0;
        int ret = 0 ;
        Set<Integer> saved = new HashSet<Integer>();
        for(int i=0;i<A.length;i++){
            if (saved.contains(A[i])){
                saved.remove(A[i]);
            }else{
                saved.add(A[i]);
            }
        }
        Iterator it= saved.iterator();
    	while(it.hasNext()){
	    	ret = Integer.parseInt( it.next().toString());
    	}
        return ret;
    }

}
