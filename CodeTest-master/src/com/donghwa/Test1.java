package com.donghwa;

import java.util.*;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;


class Test1 {

    @Test
    public void assertion(){
        int result = solution(7, new int[][]{{1,2},{2,5}, {2,6},{1,3},{1,4},{3,7}}, new String[]{"root", "abcd", "cs", "hello", "etc", "hello", "solution"});
        assertNotNull(result);
    }


    String longest;
    public int solution(int N, int[][] relation, String[] dirname) {
        int answer = 0;

        List<Dir> allDirList = new ArrayList<>();
        for (int i = 0; i < N; i++) {
            allDirList.add(new Dir());
        }

        for (int i = 0; i < relation.length ; i++) {
            int[] ints = relation[i];
            String childDirName = dirname[ints[1] - 1];

            Dir childDir = new Dir(ints[1], childDirName);

            String parentDirName = dirname[ints[0] - 1 ];
            Dir parentDir = allDirList.stream()
                    .filter(dir -> dir.index == ints[0]).findFirst()
                    .orElse(new Dir(ints[0] , parentDirName));

            parentDir.subList.add(childDir);
            allDirList.set(parentDir.index - 1 , parentDir);
            allDirList.set(childDir.index - 1, childDir);
        }

        Dir root = allDirList.get(0);
        longest = root.dirname;
        getLongest(root, longest);
        return longest.length();
    }

    public String getLongest(Dir root, String rootPath){
        for (Dir dir: root.subList) {
            String path = rootPath;
            path += "/" + dir.dirname;
            if (longest.length() < path.length())  {
                longest = path;
            }
            getLongest(dir, path);
        }
        return rootPath;
    }


    public class Dir{
        int index;
        String dirname;
        List<Dir> subList = new ArrayList<>();

        public Dir(int index, String dirName) {
            this.index = index;
            this.dirname = dirName;
        }
        public Dir(){ }
    }
}
