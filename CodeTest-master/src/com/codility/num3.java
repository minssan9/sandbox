package com.codility;

public class num3 {
    int ret = 0;
    public int solution(int[][] A) {
        // write your co
        for(int i=0; i< A.length;i++){
            int boundY = A.length-i;
            for (int j=0; j<A[i].length;j++){
                int boundX = A[i].length-j;
                if (sumTest(A, i, j, Math.max(boundX, boundY)) ) return ret;
            }
        }
        return 1;
    }

    boolean sumTest(int[][] A, int startX, int startY, int testSize  ){
        int tmpSumCol = 0;
        int tmpSumRow = 0;
        int tmpSumX = 0;

        for(int i=2; i< testSize; i++){
            for (int j=startX;j<testSize;j++){
                tmpSumCol += A[startY][j];
            }
            for (int j=startY;j<testSize;j++){
                tmpSumCol += A[j][startX];
            }
            for (int j=startX;j<testSize;j++){
                tmpSumCol += A[j][j];
            }
            if (tmpSumCol==tmpSumRow && tmpSumRow==tmpSumX){
                ret = testSize;
                return true;
            }
        }
        return  false;
    }
}
