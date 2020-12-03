

import http.HttpRequest;
import http.HttpResponse;

import java.io.Writer;

public class  HelloServlet implements SimpleServlet {
    @Override
    public void service(HttpRequest req, HttpResponse res) throws Exception{
        Writer writer=res.getWriter();
        writer.write("Hello.html");
        writer.write(req.getParameter("name"));
    }

}