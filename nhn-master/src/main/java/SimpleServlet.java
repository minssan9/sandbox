import http.HttpRequest;
import http.HttpResponse;

public interface SimpleServlet {
    public void service(HttpRequest req, HttpResponse res) throws Exception;
}