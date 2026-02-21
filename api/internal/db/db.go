// Package db contains all our database functions, conveniently placed in one spot.
// We use SQLX to handle the queries, because it's just so nice!
package db

import (
	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

type DB struct {
	conn *sqlx.DB
}

func New(connectionString string) (*DB, error) {
	sql, err := sqlx.Connect("mysql", connectionString)
	if err != nil {
		return nil, err
	}

	return &DB{
		sql,
	}, nil
}

func (db *DB) Tx() (*sqlx.Tx, error) {
	return db.conn.Beginx()
}
