<%@ page language="java" contentType="application/json; charset=UTF-8"
    pageEncoding="UTF-8" import="java.io.File, java.util.ArrayList"%>
<%
    try {
        // 设置响应内容类型为JSON
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        
        // 获取当前JSP文件所在的目录
        String currentPath = application.getRealPath(request.getServletPath());
        File currentFile = new File(currentPath);
        File directory = currentFile.getParentFile();
        
        // 存储文件名的列表
        ArrayList<String> fileNames = new ArrayList<>();
        
        // 获取目录下的所有文件
        if (directory != null && directory.exists() && directory.isDirectory()) {
            File[] files = directory.listFiles();
            if (files != null) {
                // 遍历所有文件，添加文件名到列表（排除当前JSP文件）
                for (File file : files) {
                    if (file.isFile() && !file.getName().equals(currentFile.getName())) {
                        fileNames.add(file.getName());
                    }
                }
            }
        }
        
        // 使用StringBuilder构建JSON字符串
        StringBuilder jsonBuilder = new StringBuilder();
        jsonBuilder.append("[");
        
        for (int i = 0; i < fileNames.size(); i++) {
            // 转义文件名中的特殊字符以确保JSON格式正确
            String escapedFileName = fileNames.get(i).replace("\\", "\\\\").replace("\"", "\\\"");
            jsonBuilder.append('"').append(escapedFileName).append('"');
            if (i < fileNames.size() - 1) {
                jsonBuilder.append(",");
            }
        }
        
        jsonBuilder.append("]");
        
        // 输出JSON字符串
        out.print(jsonBuilder.toString());
        out.flush();
    } catch (Exception e) {
        // 发生异常时返回空数组的JSON
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        out.print("[]");
        out.flush();
    }
%>