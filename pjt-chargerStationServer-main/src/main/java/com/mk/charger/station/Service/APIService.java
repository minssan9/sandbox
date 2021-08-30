package com.mk.charger.station.Service;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface APIService<T> {
     T save(T entity);

    List<T> findAll();
}
