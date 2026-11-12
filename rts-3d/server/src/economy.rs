//! 경제 (`src/sim/economy.ts`의 Rust 이식). 멀티플레이에서는 서버가 이 상태를 소유한다.

use serde::Serialize;

use crate::factions::{faction, BuildingType, Cost, FactionId, UnitType};

pub const MAX_SUPPLY: f64 = 100.0;
pub const GAS_WORKERS_PER_BUILDING: u32 = 3;
pub const QUEUE_LIMIT: usize = 5;
/// 플레이어당 전투 유닛 상한 (일꾼 제외, 생산 대기 포함)
pub const UNIT_CAP: u32 = 100;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub unit_type: UnitType,
    pub remaining: f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Building {
    pub id: u32,
    #[serde(rename = "type")]
    pub kind: BuildingType,
    pub done: bool,
    pub progress: f64,
    pub hp: f64,
    pub shield: f64,
    pub queue: Vec<Job>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Economy {
    pub faction_id: FactionId,
    pub ore: f64,
    pub gas: f64,
    pub workers_ore: u32,
    pub workers_gas: u32,
    pub supply_used: f64,
    /// 살아있는 + 생산 대기 중인 전투 유닛 수
    pub army: u32,
    pub buildings: Vec<Building>,
    #[serde(skip)]
    next_id: u32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WorkerTarget {
    Ore,
    Gas,
}

impl Economy {
    pub fn new(faction_id: FactionId) -> Self {
        Self::with(faction_id, 50.0, 4)
    }

    pub fn with(faction_id: FactionId, ore: f64, workers: u32) -> Self {
        let f = faction(faction_id);
        let mut eco = Economy {
            faction_id,
            ore,
            gas: 0.0,
            workers_ore: workers,
            workers_gas: 0,
            supply_used: workers as f64 * f.unit(UnitType::Worker).supply,
            army: 0,
            buildings: Vec::new(),
            next_id: 1,
        };
        let hq = eco.make_building(BuildingType::Hq, true);
        eco.buildings.push(hq);
        eco
    }

    fn make_building(&mut self, kind: BuildingType, done: bool) -> Building {
        let def = faction(self.faction_id).building(kind);
        let id = self.next_id;
        self.next_id += 1;
        Building {
            id,
            kind,
            done,
            progress: if done { def.build_time } else { 0.0 },
            hp: def.hp,
            shield: def.shield.unwrap_or(0.0),
            queue: Vec::new(),
        }
    }

    pub fn supply_cap(&self) -> f64 {
        let f = faction(self.faction_id);
        let cap: f64 = self
            .buildings
            .iter()
            .filter(|b| b.done)
            .map(|b| f.building(b.kind).supply.unwrap_or(0.0))
            .sum();
        cap.min(MAX_SUPPLY)
    }

    pub fn gas_capacity(&self) -> u32 {
        self.buildings.iter().filter(|b| b.kind == BuildingType::Gas && b.done).count() as u32
            * GAS_WORKERS_PER_BUILDING
    }

    pub fn can_afford(&self, c: Cost) -> bool {
        self.ore >= c.ore && self.gas >= c.gas
    }

    fn pay(&mut self, c: Cost) {
        self.ore -= c.ore;
        self.gas -= c.gas;
    }

    pub fn queue_building(&mut self, kind: BuildingType) -> Result<u32, String> {
        let def = faction(self.faction_id).building(kind);
        if !self.can_afford(def.cost) {
            return Err("자원 부족".into());
        }
        self.pay(def.cost);
        let b = self.make_building(kind, false);
        let id = b.id;
        self.buildings.push(b);
        Ok(id)
    }

    pub fn queue_unit(&mut self, building_id: u32, unit_type: UnitType) -> Result<(), String> {
        let f = faction(self.faction_id);
        let cap = self.supply_cap();
        let (supply, cost, build_time) = {
            let def = f.unit(unit_type);
            (def.supply, def.cost, def.build_time)
        };
        let Some(b) = self.buildings.iter().find(|b| b.id == building_id) else {
            return Err("건물이 준비되지 않음".into());
        };
        if !b.done {
            return Err("건물이 준비되지 않음".into());
        }
        if !f.building(b.kind).produces.contains(&unit_type) {
            return Err("생산 불가".into());
        }
        if b.queue.len() >= QUEUE_LIMIT {
            return Err("큐가 가득 참".into());
        }
        if unit_type != UnitType::Worker && self.army >= UNIT_CAP {
            return Err(format!("유닛 한도({UNIT_CAP}) 도달"));
        }
        if self.supply_used + supply > cap {
            return Err("인구수 부족".into());
        }
        if !self.can_afford(cost) {
            return Err("자원 부족".into());
        }
        self.pay(cost);
        self.supply_used += supply; // 큐에 넣는 순간 예약
        if unit_type != UnitType::Worker {
            self.army += 1;
        }
        let b = self.buildings.iter_mut().find(|b| b.id == building_id).expect("checked above");
        b.queue.push(Job { unit_type, remaining: build_time });
        Ok(())
    }

    pub fn move_worker(&mut self, target: WorkerTarget) -> bool {
        match target {
            WorkerTarget::Gas => {
                if self.workers_ore == 0 || self.workers_gas >= self.gas_capacity() {
                    return false;
                }
                self.workers_ore -= 1;
                self.workers_gas += 1;
            }
            WorkerTarget::Ore => {
                if self.workers_gas == 0 {
                    return false;
                }
                self.workers_gas -= 1;
                self.workers_ore += 1;
            }
        }
        true
    }

    /// 전투 유닛 사망 시 인구수와 유닛 수 반환
    pub fn release_unit(&mut self, supply: f64) {
        self.supply_used = (self.supply_used - supply).max(0.0);
        self.army = self.army.saturating_sub(1);
    }

    /// 시간 진행. 생산 완료된 전투 유닛 타입 반환 (일꾼은 내부 처리)
    pub fn tick(&mut self, dt: f64) -> Vec<UnitType> {
        let f = faction(self.faction_id);
        let mut spawned = Vec::new();
        self.ore += self.workers_ore as f64 * f.worker_income.ore * dt;
        self.gas += self.workers_gas.min(self.gas_capacity()) as f64 * f.worker_income.gas * dt;

        let mut new_workers = 0;
        for b in self.buildings.iter_mut() {
            if !b.done {
                b.progress += dt;
                if b.progress >= f.building(b.kind).build_time {
                    b.done = true;
                }
                continue;
            }
            let Some(job) = b.queue.first_mut() else { continue };
            job.remaining -= dt;
            if job.remaining <= 0.0 {
                let job = b.queue.remove(0);
                if job.unit_type == UnitType::Worker {
                    new_workers += 1;
                } else {
                    spawned.push(job.unit_type);
                }
            }
        }
        self.workers_ore += new_workers;
        spawned
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn harvest_build_train_flow() {
        let mut eco = Economy::with(FactionId::Coalition, 1000.0, 4);
        assert_eq!(eco.supply_cap(), 10.0);
        let fac = eco.queue_building(BuildingType::Factory).unwrap();
        assert!(eco.queue_unit(fac, UnitType::Infantry).is_err()); // 건설 중
        eco.tick(35.0);
        eco.queue_unit(fac, UnitType::Infantry).unwrap();
        assert_eq!(eco.tick(15.0), vec![UnitType::Infantry]);
        assert_eq!(eco.supply_used, 5.0);
        assert_eq!(eco.army, 1);
    }

    #[test]
    fn unit_cap_excludes_workers_and_frees_on_death() {
        let mut eco = Economy::with(FactionId::Swarm, 1e6, 4);
        let factories: Vec<u32> = (0..25).map(|_| eco.queue_building(BuildingType::Factory).unwrap()).collect();
        eco.tick(40.0);
        eco.supply_used = -1000.0; // 인구수 제약 제거
        let mut queued = 0;
        for &f in &factories {
            for _ in 0..5 {
                if eco.queue_unit(f, UnitType::Infantry).is_ok() {
                    queued += 1;
                }
            }
        }
        assert_eq!(queued, UNIT_CAP);
        let spare = *factories.iter().find(|&&f| eco.buildings.iter().any(|b| b.id == f && b.queue.len() < 5)).unwrap();
        assert_eq!(eco.queue_unit(spare, UnitType::Infantry), Err("유닛 한도(100) 도달".into()));
        let hq = eco.buildings[0].id;
        assert!(eco.queue_unit(hq, UnitType::Worker).is_ok());
        eco.release_unit(0.5);
        assert!(eco.queue_unit(spare, UnitType::Infantry).is_ok());
    }

    #[test]
    fn gas_workers_limited_by_buildings() {
        let mut eco = Economy::with(FactionId::Swarm, 500.0, 4);
        assert!(!eco.move_worker(WorkerTarget::Gas));
        eco.queue_building(BuildingType::Gas).unwrap();
        eco.tick(20.0);
        for _ in 0..3 {
            assert!(eco.move_worker(WorkerTarget::Gas));
        }
        assert!(!eco.move_worker(WorkerTarget::Gas));
    }
}
