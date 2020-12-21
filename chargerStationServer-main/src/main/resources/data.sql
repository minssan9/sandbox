
INSERT INTO STATION (station_id,addr,busiCall,busiId,busiNm,chgerId,chgerType,lat,lng,note,parkingFree,powerType,stat,statId,statNm,statUpdDt,useTime,zcode) VALUES (1,'서울특별시 종로구 종로 157, 지하주차장 4층 하층 T구역','1661-9408','ME','환경부','01','03',37.571076,126.99588,'',0,'',2,'ME000001','종묘 공영주차장','20201220181331','24시간 이용가능',11);

INSERT INTO STATION (station_id,addr,busiCall,busiId,busiNm,chgerId,chgerType,lat,lng,note,parkingFree,powerType,stat,statId,statNm,statUpdDt,useTime,zcode) VALUES (2,'2번째 주차장','1661-9408','ME','환경부','01','03',37.571076,126.99588,'',0,'',2,'ME000001','종묘 공영주차장','20201220181331','24시간 이용가능',11);



INSERT INTO `charger`.`powertype`
(`powertype_id`,
`powertype`,
`volt`)
VALUES
(1,'common', 220);

INSERT INTO `charger`.`powertype`
(`powertype_id`,
`powertype`,
`volt`)
VALUES
(2,'powerttype1', 110);

INSERT INTO `charger`.`charger`
(`charger_id`,
`chargerOption`,
`chargerType`,
`useStatus`,
`powerType_powertype_id`,
`station_id`)
VALUES
(1, 'AA','HMC', 'N', 1, 1);


INSERT INTO `charger`.`charger`
(`charger_id`,
`chargerOption`,
`chargerType`,
`useStatus`,
`powerType_powertype_id`,
`station_id`)
VALUES
(2, 'AA','type2', 'N', 2, 1);