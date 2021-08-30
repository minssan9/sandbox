package com.mk.charger.station.Domain;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import lombok.*;

import javax.persistence.*;


@Data
@Entity
@NoArgsConstructor
@Table(name = "charger")
public class Charger {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "charger_id")
    private Long id;


    private String chargerType;
    private String chargerOption;
    private String useStatus;

    @JsonManagedReference
    @OneToOne
    private PowerType powerType;

    @JsonBackReference
    @ManyToOne( fetch = FetchType.EAGER)
    @JoinColumn(name = "station_id")
    private Station station;


    //Many to One 단방향
//    @ManyToOne( fetch = FetchType.LAZY)
//    @JoinColumn(name = "station_id")
//    private Station station;
}
