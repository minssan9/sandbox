package com.mk.charger.Service;
 
import com.mk.charger.station.Dto.StationInfo;
import com.mk.charger.station.Service.StationService;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.junit.Assert;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.web.client.RestTemplate;

import java.util.List;


@RunWith(SpringRunner.class)
@SpringBootTest
public class PatchTest {

    @Autowired
    StationService stationService;

    @Test
    public void 공공데이터가져오기() throws Exception {
        JSONParser parser = new JSONParser();
        RestTemplate restTemplate = new RestTemplate();

        // 오브젝트로 결과값 받아오기
        HttpHeaders headers = new HttpHeaders();
        HttpEntity entity = new HttpEntity("parameters", headers);

//        stationInfoFromGovs = stationService.patchDatabaseFromServer();

        String serviceKey =  "dKNTmNiGHpcJLrC4HIJc3nW4AaPPKOQLCvlzV7IQZDTTztv6PTuDusZxS8iC1vpBEtkLsnk97WEzKpEvf3Zqgg==";
        String urlString = ("http://open.ev.or.kr:8080/openapi/services/EvCharger/getChargerInfo");
        urlString = ("http://open.ev.or.kr:8080/openapi/services/EvCharger/getChargerInfo?serviceKey="+ serviceKey + "&pageNo=1&pageSize=100");

        ResponseEntity<String> response  = restTemplate.exchange(urlString, HttpMethod.GET, entity, String.class);

        JSONObject jsonObj = (JSONObject)parser.parse( response.getBody() );
        String itemsJSON = jsonObj.get("items").toString();

        JSONArray itemsJSONArray = (JSONArray) parser.parse(itemsJSON);
        JSONObject itemsJSONObject = (JSONObject) itemsJSONArray.get(0);
        List<StationInfo> items = (List<StationInfo>) itemsJSONObject.get("item");


        Assert.assertNotNull(items);
    }
}
