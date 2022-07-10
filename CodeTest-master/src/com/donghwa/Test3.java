package com.donghwa;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;


class Test3 {

    @Test
    public void assertion(){
        int[] result = solution(new int[][]{{1, 1, 0, 1, 1}, {0, 1, 1, 0, 0}, {0, 0, 0, 0, 0}, {1, 1, 0, 1, 1}, {1, 0, 1, 1, 1}, {1, 0, 1, 1, 1}});
        assertNotNull(result);
    }


    int[][] board = new int[50][50];
    boolean[][] visited = new boolean[51][51];
    int boxCount = 0;
    int biggest = 0;

    int size = 0;

    public int[] solution(int[][] v){
        board = v;

        for (int i = 0; i < v.length; i++) {
            for (int j = 0; j < v[i].length; j++) {
                if(visited[i][j] || board[i][j] == 0) continue;
                size = 0;
                size = bfs(i,j, size);
                visited[i][j] = true;

                if(size > biggest) biggest = size;
                if(size > 0) boxCount++;
            }
        }

        int[]  answer = {boxCount, biggest};
        return answer;
    }

    int bfs(int dx, int dy, int size){
        if(dx < 0 || dy < 0 ) return size;
        if(dx >= board.length)
            return size;
        if(dy >= board[dx].length)
            return size;


        if(board[dx][dy] == 1 && !visited[dx][dy]) {
            visited[dx][dy] = true;
            size++;
        }else{
            visited[dx][dy] = true;
            return size;
        }

        size = bfs(dx + 1, dy, size);
        size = bfs(dx - 1, dy, size);
        size = bfs(dx, dy + 1, size);
        size = bfs(dx, dy - 1, size);
        return size;
    }

//    void bfs2(int dx, int dy){
//        for(int i = 0; i < v.length; i++){
//            for(int j = 0; j < v[i].length; j++){
//                if (visited[i][j]) continue;
//                visited[i][j] = true;
//
//            }
//        }
//    }

    int isBiggest(int newBox, int biggest){
        if (newBox > biggest) biggest = newBox;
        return biggest;
    }

}
